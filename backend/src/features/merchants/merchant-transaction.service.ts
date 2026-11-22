import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import {
  formatHundredths,
  formatMillimesAsTnd,
  parseTndToMillimes,
} from '../../shared/money';
import { classifyCustomerQrInput } from '../../shared/security/customer-qr';
import {
  calculatePurchaseEarning,
  findReward,
  listRewards,
  ProgrammeConfiguration,
  readPointsRateHundredths,
} from '../loyalty/earning-calculator';
import {
  LoyaltyActivityType,
  LoyaltyLedgerService,
  LoyaltyTransactionCategory,
} from '../loyalty/loyalty-ledger.service';
import { BusinessAccessService } from './business-access.service';
import { ensureActiveMembership } from './customer-enrolment';
import {
  CalculateEarningsDto,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionDto,
  CreateLoyaltyTransactionResponse,
  CurrencyTotals,
  CustomerForTransactionResponse,
  ListTransactionsQueryDto,
  TransactionHistorySummary,
  RedeemRewardDto,
  RedeemRewardResponse,
  ReverseTransactionDto,
  ReverseTransactionResponse,
  TransactionHistoryItem,
  TransactionHistoryResponse,
} from './dto/merchant-transaction.dto';

/** Fixed page size of the merchant transaction history. */
const HISTORY_LIMIT = 100;

interface CustomerRow {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAccountId: string;
}

interface ProgramRow {
  programId: string;
  programType: 'stamps' | 'points' | 'both';
  programVersion: number;
  programName: string | null;
}

/**
 * Merchant stamp/points earning, reward redemption, reversal and history
 * (Checkpoint 6B-C, DECISIONS.md #15). All business data is derived from the
 * authenticated merchant's own business; writes go through the serializable
 * LoyaltyLedgerService, which also verifies balances and the repeat warning.
 */
@Injectable()
export class MerchantTransactionService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
    private readonly loyaltyLedger: LoyaltyLedgerService,
  ) {}

  async resolveCustomerForTransaction(
    authenticatedUserId: string,
    qrCredential: string,
  ): Promise<CustomerForTransactionResponse> {
    // Full credential or short ID (DECISIONS.md #20); the column is a fixed constant.
    const lookup = classifyCustomerQrInput(qrCredential);

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);

        const customerResult = await connection.query<CustomerRow>(
          `SELECT u.id AS "customerId",
                  u.name AS "customerName",
                  u.phone_number AS "customerPhone",
                  ca.id AS "customerAccountId"
           FROM customer_qr_credentials qr
           JOIN customer_accounts ca ON ca.id = qr.customer_account_id
           JOIN users u ON u.id = ca.user_id
           WHERE qr.${lookup.column} = $1 AND qr.revoked_at IS NULL
           LIMIT 1`,
          [lookup.hash],
        );
        const customer = customerResult.rows[0];
        if (!customer) {
          throw new NotFoundException('Customer QR credential is invalid or revoked');
        }

        const programResult = await connection.query<ProgramRow>(
          `SELECT p.id AS "programId",
                  p.type AS "programType",
                  p.version AS "programVersion",
                  p.name AS "programName"
           FROM programs p
           WHERE p.business_id = $1 AND p.status = 'active'
           LIMIT 1`,
          [businessId],
        );
        const program = programResult.rows[0];
        if (!program) {
          throw new NotFoundException(
            'No active loyalty programme found for this business',
          );
        }

        const configurations = await this.loadActiveConfigurations(connection, businessId);

        // Scanning enrols the customer (DECISIONS.md #21); only after the programme checks.
        const membership = await ensureActiveMembership(
          connection,
          customer.customerAccountId,
          businessId,
        );
        const balance = await this.loyaltyLedger.getBalance(
          connection,
          businessId,
          membership.membershipId,
        );

        const stampsConfig = configurations.find((c) => c.type === 'stamps');
        const pointsConfig = configurations.find((c) => c.type === 'points');

        return {
          customer: {
            id: customer.customerId,
            name: customer.customerName,
            phoneNumber: customer.customerPhone,
          },
          membership: {
            id: membership.membershipId,
            status: membership.status,
            joinedAt: membership.joinedAt,
            enrolment: membership.enrolment,
          },
          balance,
          program: {
            id: program.programId,
            type: program.programType,
            version: program.programVersion,
            name: program.programName,
            configurations: {
              ...(stampsConfig && { stamps: { configurationId: stampsConfig.id } }),
              ...(pointsConfig && {
                points: {
                  configurationId: pointsConfig.id,
                  earningRate: this.safeRate(pointsConfig),
                },
              }),
            },
          },
          rewards: configurations.flatMap((configuration) =>
            listRewards(configuration).map((reward) => ({
              ...reward,
              available: balance[reward.activityType] >= reward.cost,
            })),
          ),
        };
      },
    );
  }

  async calculateEarnings(
    authenticatedUserId: string,
    dto: CalculateEarningsDto,
  ): Promise<CalculateEarningsResponse> {
    const amountMillimes = this.parseOptionalAmount(dto.purchaseAmount);

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);
        await this.requireActiveMembership(connection, businessId, dto.membershipId);
        const configurations = await this.loadActiveConfigurations(connection, businessId);
        const earning = calculatePurchaseEarning(configurations, amountMillimes);
        const balance = await this.loyaltyLedger.getBalance(
          connection,
          businessId,
          dto.membershipId,
        );

        return {
          purchaseAmount: amountMillimes === null ? null : formatMillimesAsTnd(amountMillimes),
          stampsToEarn: earning.stamps,
          pointsToEarn: earning.points,
          earningRate:
            earning.earningRateHundredths === null
              ? null
              : formatHundredths(earning.earningRateHundredths),
          totalStampsAfter: balance.stamps + earning.stamps,
          totalPointsAfter: balance.points + earning.points,
        };
      },
    );
  }

  async createLoyaltyTransaction(
    authenticatedUserId: string,
    dto: CreateLoyaltyTransactionDto,
  ): Promise<CreateLoyaltyTransactionResponse> {
    const amountMillimes = this.parseOptionalAmount(dto.purchaseAmount);

    const earning = await this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);
        await this.requireActiveMembership(connection, businessId, dto.membershipId);
        await this.requireBranchWhenSeveral(connection, businessId, dto.branchId);
        const configurations = await this.loadActiveConfigurations(connection, businessId);
        return calculatePurchaseEarning(configurations, amountMillimes);
      },
    );

    const result = await this.loyaltyLedger.createTransaction(authenticatedUserId, {
      membershipId: dto.membershipId,
      branchId: dto.branchId,
      category: 'purchase',
      idempotencyKey: dto.idempotencyKey,
      purchaseAmountMillimes: amountMillimes ?? undefined,
      repeatEarning: { confirmed: dto.confirmRepeat === true },
      entries: earning.entries,
    });

    return {
      transactionId: result.id,
      membershipId: dto.membershipId,
      purchaseAmount: amountMillimes === null ? null : formatMillimesAsTnd(amountMillimes),
      stampsEarned: earning.stamps,
      pointsEarned: earning.points,
      earningRate:
        earning.earningRateHundredths === null
          ? null
          : formatHundredths(earning.earningRateHundredths),
      newBalance: result.balance,
      occurredAt: new Date(result.occurredAt).toISOString(),
      idempotencyKey: dto.idempotencyKey,
    };
  }

  async redeemReward(
    authenticatedUserId: string,
    dto: RedeemRewardDto,
  ): Promise<RedeemRewardResponse> {
    const reward = await this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);
        await this.requireActiveMembership(connection, businessId, dto.membershipId);
        await this.requireBranchWhenSeveral(connection, businessId, dto.branchId);

        const configurationResult = await connection.query<ProgrammeConfiguration>(
          `SELECT pc.id, pc.type, pc.settings
           FROM program_configurations pc
           JOIN programs p ON p.id = pc.program_id
           WHERE pc.id = $1 AND p.business_id = $2 AND p.status = 'active'`,
          [dto.configurationId, businessId],
        );
        const configuration = configurationResult.rows[0];
        if (!configuration) {
          throw new NotFoundException('Reward not found or not available');
        }
        return findReward(configuration, dto.rewardIndex);
      },
    );

    // The balance is verified inside the serializable ledger transaction.
    const result = await this.loyaltyLedger.createTransaction(authenticatedUserId, {
      membershipId: dto.membershipId,
      branchId: dto.branchId,
      category: 'redemption',
      idempotencyKey: dto.idempotencyKey,
      entries: [
        {
          activityType: reward.activityType,
          delta: -reward.cost,
          programConfigurationId: reward.configurationId,
        },
      ],
    });

    return {
      transactionId: result.id,
      membershipId: dto.membershipId,
      reward,
      newBalance: result.balance,
      occurredAt: new Date(result.occurredAt).toISOString(),
      idempotencyKey: dto.idempotencyKey,
    };
  }

  async reverseTransaction(
    authenticatedUserId: string,
    transactionId: string,
    dto: ReverseTransactionDto,
  ): Promise<ReverseTransactionResponse> {
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : '';
    if (reason.length < 1 || reason.length > 500) {
      throw new BadRequestException(
        'A reversal reason of 1 to 500 characters is required',
      );
    }

    const original = await this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);
        const transactionResult = await connection.query<{
          id: string;
          membershipId: string;
          category: LoyaltyTransactionCategory;
        }>(
          `SELECT id, membership_id AS "membershipId", category
           FROM loyalty_transactions WHERE id = $1 AND business_id = $2`,
          [transactionId, businessId],
        );
        const transaction = transactionResult.rows[0];
        if (!transaction) {
          throw new NotFoundException('Transaction not found for this business');
        }
        if (transaction.category === 'reversal') {
          throw new BadRequestException('A reversal cannot be reversed');
        }
        const entriesResult = await connection.query<{
          id: string;
          activityType: LoyaltyActivityType;
          delta: number;
          programConfigurationId: string;
        }>(
          `SELECT id, activity_type AS "activityType", delta,
                  program_configuration_id AS "programConfigurationId"
           FROM loyalty_activity_entries
           WHERE transaction_id = $1
           ORDER BY id`,
          [transactionId],
        );
        return { ...transaction, entries: entriesResult.rows };
      },
    );

    const entries = original.entries.map((entry) => ({
      activityType: entry.activityType,
      delta: -entry.delta,
      programConfigurationId: entry.programConfigurationId,
      reversesEntryId: entry.id,
    }));

    // Single reversal, exact inverse, finality and non-negative balances are
    // enforced inside the serializable ledger transaction.
    const result = await this.loyaltyLedger.createTransaction(authenticatedUserId, {
      membershipId: original.membershipId,
      category: 'reversal',
      idempotencyKey: dto.idempotencyKey,
      reversesTransactionId: original.id,
      reversalReason: reason,
      entries,
    });

    return {
      transactionId: result.id,
      reversesTransactionId: original.id,
      membershipId: original.membershipId,
      reason,
      stampsDelta: this.sumDelta(entries, 'stamps'),
      pointsDelta: this.sumDelta(entries, 'points'),
      newBalance: result.balance,
      occurredAt: new Date(result.occurredAt).toISOString(),
      idempotencyKey: dto.idempotencyKey,
    };
  }

  async listTransactions(
    authenticatedUserId: string,
    query: ListTransactionsQueryDto,
  ): Promise<TransactionHistoryResponse> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        const businessId = await this.requireBusiness(connection, authenticatedUserId);
        const transactionsResult = await connection.query<{
          id: string;
          membershipId: string;
          branchId: string | null;
          category: LoyaltyTransactionCategory;
          occurredAt: Date;
          purchaseAmountMillimes: string | null;
          reversalReason: string | null;
          reversesTransactionId: string | null;
          reversedByTransactionId: string | null;
        }>(
          `SELECT t.id,
                  t.membership_id AS "membershipId",
                  t.branch_id AS "branchId",
                  t.category,
                  t.occurred_at AS "occurredAt",
                  t.purchase_amount_millimes AS "purchaseAmountMillimes",
                  t.reversal_reason AS "reversalReason",
                  t.reverses_transaction_id AS "reversesTransactionId",
                  (SELECT r.id FROM loyalty_transactions r
                   WHERE r.reverses_transaction_id = t.id) AS "reversedByTransactionId"
           FROM loyalty_transactions t
           WHERE t.business_id = $1
             AND ($2::uuid IS NULL OR t.membership_id = $2)
           ORDER BY t.occurred_at DESC, t.created_at DESC, t.id
           LIMIT ${HISTORY_LIMIT}`,
          [businessId, query.membershipId ?? null],
        );
        const transactions = transactionsResult.rows;
        // Additive: only when a membership is requested (customer detail views).
        const summary = query.membershipId
          ? await this.buildSummary(connection, businessId, query.membershipId)
          : undefined;
        if (!transactions.length) {
          return { transactions: [], ...(summary && { summary }) };
        }

        const entriesResult = await connection.query<{
          transactionId: string;
          activityType: LoyaltyActivityType;
          delta: number;
          programConfigurationId: string;
          earningRateHundredths: number | null;
        }>(
          `SELECT transaction_id AS "transactionId",
                  activity_type AS "activityType",
                  delta,
                  program_configuration_id AS "programConfigurationId",
                  earning_rate_hundredths AS "earningRateHundredths"
           FROM loyalty_activity_entries
           WHERE transaction_id = ANY($1::uuid[])
           ORDER BY created_at, id`,
          [transactions.map((t) => t.id)],
        );

        return {
          transactions: transactions.map((t): TransactionHistoryItem => {
            const entries = entriesResult.rows
              .filter((e) => e.transactionId === t.id)
              .map((e) => ({
                activityType: e.activityType,
                delta: e.delta,
                programConfigurationId: e.programConfigurationId,
                earningRate:
                  e.earningRateHundredths === null || e.earningRateHundredths === undefined
                    ? null
                    : formatHundredths(e.earningRateHundredths),
              }));
            return {
              id: t.id,
              membershipId: t.membershipId,
              branchId: t.branchId,
              category: t.category,
              occurredAt: new Date(t.occurredAt).toISOString(),
              purchaseAmount:
                t.purchaseAmountMillimes === null
                  ? null
                  : formatMillimesAsTnd(t.purchaseAmountMillimes),
              reversalReason: t.reversalReason,
              reversesTransactionId: t.reversesTransactionId,
              reversedByTransactionId: t.reversedByTransactionId,
              stampsDelta: this.sumDelta(entries, 'stamps'),
              pointsDelta: this.sumDelta(entries, 'points'),
              entries,
            };
          }),
          ...(summary && { summary }),
        };
      },
    );
  }

  /**
   * Totals over ALL ledger entries of the membership, scoped by business.
   * Each reversal is classified by the category of the transaction it reverses
   * (a reversed adjustment folds into `adjustments`). The balance is the plain
   * ledger sum, so balance = earned - earningsReversed - redeemed +
   * redemptionsReversed + adjustments always holds.
   */
  private async buildSummary(
    connection: PoolClient,
    businessId: string,
    membershipId: string,
  ): Promise<TransactionHistorySummary> {
    const totalsResult = await connection.query<
      { activityType: LoyaltyActivityType } & Record<keyof CurrencyTotals, string | number>
    >(
      `SELECT e.activity_type AS "activityType",
              COALESCE(SUM(e.delta) FILTER (WHERE t.category = 'purchase'), 0)::bigint AS "earned",
              COALESCE(-SUM(e.delta) FILTER (WHERE t.category = 'reversal' AND o.category = 'purchase'), 0)::bigint AS "earningsReversed",
              COALESCE(-SUM(e.delta) FILTER (WHERE t.category = 'redemption'), 0)::bigint AS "redeemed",
              COALESCE(SUM(e.delta) FILTER (WHERE t.category = 'reversal' AND o.category = 'redemption'), 0)::bigint AS "redemptionsReversed",
              COALESCE(SUM(e.delta) FILTER (WHERE t.category = 'manual_adjustment'
                OR (t.category = 'reversal' AND o.category IS DISTINCT FROM 'purchase' AND o.category IS DISTINCT FROM 'redemption')), 0)::bigint AS "adjustments",
              COALESCE(SUM(e.delta), 0)::bigint AS "balance"
       FROM loyalty_activity_entries e
       JOIN loyalty_transactions t ON t.id = e.transaction_id
       LEFT JOIN loyalty_transactions o ON o.id = t.reverses_transaction_id
       WHERE t.business_id = $1 AND t.membership_id = $2
       GROUP BY e.activity_type`,
      [businessId, membershipId],
    );
    const zero = (): CurrencyTotals => ({
      earned: 0,
      earningsReversed: 0,
      redeemed: 0,
      redemptionsReversed: 0,
      adjustments: 0,
      balance: 0,
    });
    const totals = { stamps: zero(), points: zero() };
    for (const row of totalsResult.rows) {
      if (row.activityType !== 'stamps' && row.activityType !== 'points') continue;
      totals[row.activityType] = {
        earned: Number(row.earned),
        earningsReversed: Number(row.earningsReversed),
        redeemed: Number(row.redeemed),
        redemptionsReversed: Number(row.redemptionsReversed),
        adjustments: Number(row.adjustments),
        balance: Number(row.balance),
      };
    }

    const countResult = await connection.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM loyalty_transactions
       WHERE business_id = $1 AND membership_id = $2`,
      [businessId, membershipId],
    );

    const programResult = await connection.query<ProgramRow>(
      `SELECT p.id AS "programId",
              p.type AS "programType",
              p.version AS "programVersion",
              p.name AS "programName"
       FROM programs p
       WHERE p.business_id = $1 AND p.status = 'active'
       LIMIT 1`,
      [businessId],
    );
    const configurationsResult = await connection.query<ProgrammeConfiguration>(
      `SELECT pc.id, pc.type, pc.settings
       FROM program_configurations pc
       JOIN programs p ON p.id = pc.program_id
       WHERE p.business_id = $1 AND p.status = 'active'
       ORDER BY pc.type`,
      [businessId],
    );

    return {
      stamps: totals.stamps,
      points: totals.points,
      transactionCount: Number(countResult.rows[0]?.count ?? 0),
      programType: programResult.rows[0]?.programType ?? null,
      rewards: configurationsResult.rows.flatMap((configuration) => listRewards(configuration)),
    };
  }

  private parseOptionalAmount(value: string | undefined): number | null {
    return value === undefined || value === null ? null : parseTndToMillimes(value);
  }

  private safeRate(configuration: ProgrammeConfiguration): string | null {
    try {
      return formatHundredths(readPointsRateHundredths(configuration));
    } catch {
      return null;
    }
  }

  private sumDelta(
    entries: Array<{ activityType: LoyaltyActivityType; delta: number }>,
    activityType: LoyaltyActivityType,
  ): number {
    return entries
      .filter((entry) => entry.activityType === activityType)
      .reduce((sum, entry) => sum + entry.delta, 0);
  }

  private async requireBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<string> {
    const business = await this.businessAccess.findOwnedBusiness(connection, userId);
    if (!business) {
      throw new NotFoundException('Business not found for this merchant');
    }
    return business.id;
  }

  private async requireActiveMembership(
    connection: PoolClient,
    businessId: string,
    membershipId: string,
  ): Promise<void> {
    const result = await connection.query<{ id: string; status: string }>(
      `SELECT id, status
       FROM customer_business_memberships
       WHERE id = $1 AND business_id = $2`,
      [membershipId, businessId],
    );
    const membership = result.rows[0];
    if (!membership) {
      throw new NotFoundException(
        'Customer membership was not found for this business',
      );
    }
    if (membership.status !== 'active') {
      throw new ConflictException(
        'Customer membership is not active for this business',
      );
    }
  }

  /** DECISIONS.md #15 rule 12: a branch is recorded when the business has more than one. */
  private async requireBranchWhenSeveral(
    connection: PoolClient,
    businessId: string,
    branchId: string | undefined,
  ): Promise<void> {
    if (branchId) return; // ownership is validated by the ledger
    const result = await connection.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM branches WHERE business_id = $1',
      [businessId],
    );
    if ((result.rows[0]?.count ?? 0) > 1) {
      throw new BadRequestException(
        'A branch is required when the business has more than one branch',
      );
    }
  }

  private async loadActiveConfigurations(
    connection: PoolClient,
    businessId: string,
  ): Promise<ProgrammeConfiguration[]> {
    const result = await connection.query<ProgrammeConfiguration>(
      `SELECT pc.id, pc.type, pc.settings
       FROM program_configurations pc
       JOIN programs p ON p.id = pc.program_id
       WHERE p.business_id = $1 AND p.status = 'active'
       ORDER BY pc.type`,
      [businessId],
    );
    if (!result.rows.length) {
      throw new NotFoundException(
        'No active loyalty programme found for this business',
      );
    }
    return result.rows;
  }
}

