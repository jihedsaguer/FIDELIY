import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from './business-access.service';
import { hashCustomerQrCredential } from '../../shared/security/customer-qr';
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service';
import { CustomerBalanceService } from '../loyalty/customer-balance.service';
import {
  CustomerForTransactionResponse,
  CalculateEarningsDto,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionDto,
  CreateLoyaltyTransactionResponse,
  RedeemRewardDto,
  RedeemRewardResponse,
} from './dto/merchant-transaction.dto';

interface CustomerRow {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAccountId: string;
}

interface MembershipRow {
  membershipId: string;
  status: 'active' | 'inactive';
  joinedAt: string;
  businessId: string;
}

interface ProgramRow {
  programId: string;
  programType: 'stamps' | 'points' | 'both';
  programVersion: number;
  programName: string;
}

interface StampsConfigRow {
  configId: string | null;
  purchasesPerStamp: number | null;
  maxStampsPerTransaction: number | null;
}

interface PointsConfigRow {
  configId: string | null;
  pointsPerCurrencyUnit: number | null;
  currencyUnit: string | null;
  maxPointsPerTransaction: number | null;
}

@Injectable()
export class MerchantTransactionService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
    private readonly loyaltyLedger: LoyaltyLedgerService,
    private readonly customerBalance: CustomerBalanceService,
  ) {}

  /**
   * Resolve a customer QR credential and get their information for a transaction.
   * 
   * @param authenticatedUserId - The authenticated merchant's user ID
   * @param qrCredential - The customer's personal QR credential
   * @param branchId - Optional branch ID
   * @returns Customer information, membership, balance, programme, and eligible rewards
   */
  async resolveCustomerForTransaction(
    authenticatedUserId: string,
    qrCredential: string,
    branchId?: string,
  ): Promise<CustomerForTransactionResponse> {
    const credentialHash = hashCustomerQrCredential(qrCredential);

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Get the merchant's business
        const business = await this.businessAccess.findOwnedBusiness(
          connection,
          authenticatedUserId,
        );

        if (!business) {
          throw new NotFoundException('Business not found for this merchant');
        }

        // Resolve customer
        const customerResult = await connection.query<CustomerRow>(
          `SELECT 
             u.id AS "customerId",
             u.name AS "customerName",
             u.phone_number AS "customerPhone",
             ca.id AS "customerAccountId"
           FROM customer_qr_credentials qr
           JOIN customer_accounts ca ON ca.id = qr.customer_account_id
           JOIN users u ON u.id = ca.user_id
           WHERE qr.credential_hash = $1 AND qr.revoked_at IS NULL
           LIMIT 1`,
          [credentialHash],
        );

        if (!customerResult.rows[0]) {
          throw new NotFoundException('Customer QR credential is invalid or revoked');
        }

        const customer = customerResult.rows[0];

        // Get membership
        const membershipResult = await connection.query<MembershipRow>(
          `SELECT 
             m.id AS "membershipId",
             m.status,
             m.joined_at AS "joinedAt",
             m.business_id AS "businessId"
           FROM customer_business_memberships m
           WHERE m.customer_account_id = $1 AND m.business_id = $2
           LIMIT 1`,
          [customer.customerAccountId, business.id],
        );

        if (!membershipResult.rows[0]) {
          throw new ConflictException(
            'Customer must join this business before loyalty operations can continue',
          );
        }

        const membership = membershipResult.rows[0];

        if (membership.status !== 'active') {
          throw new ConflictException(
            'Customer membership is not active for this business',
          );
        }

        // Get programme and configuration using V2 structure
        const programResult = await connection.query<ProgramRow>(
          `SELECT 
             p.id AS "programId",
             p.type AS "programType",
             p.version AS "programVersion",
             p.name AS "programName"
           FROM programs p
           WHERE p.business_id = $1 AND p.status = 'active'
           LIMIT 1`,
          [business.id],
        );

        if (!programResult.rows[0]) {
          throw new NotFoundException(
            'No active loyalty programme found for this business',
          );
        }

        const program = programResult.rows[0];

        // Get stamps configuration using V2 structure
        const stampsConfigResult = await connection.query<StampsConfigRow>(
          `SELECT 
             pc.id AS "configId",
             (pc.settings->'stamps'->'earningRule'->>'purchasesPerStamp')::numeric AS "purchasesPerStamp",
             (pc.settings->'stamps'->'limits'->>'maxPerTransaction')::numeric AS "maxStampsPerTransaction"
           FROM program_configurations pc
           WHERE pc.program_id = $1 AND pc.type = 'stamps'
           LIMIT 1`,
          [program.programId],
        );

        // Get points configuration using V2 structure
        const pointsConfigResult = await connection.query<PointsConfigRow>(
          `SELECT 
             pc.id AS "configId",
             (pc.settings->'points'->'earningRule'->>'pointsPerCurrencyUnit')::numeric AS "pointsPerCurrencyUnit",
             pc.settings->'points'->'earningRule'->>'currencyCode' AS "currencyUnit",
             (pc.settings->'points'->'limits'->>'maxPerTransaction')::numeric AS "maxPointsPerTransaction"
           FROM program_configurations pc
           WHERE pc.program_id = $1 AND pc.type = 'points'
           LIMIT 1`,
          [program.programId],
        );

        const stampsConfig = stampsConfigResult.rows[0];
        const pointsConfig = pointsConfigResult.rows[0];

        // Get customer balance
        const balance = await this.customerBalance.getBalance(
          customer.customerId,
          membership.membershipId,
        );

        // Build configuration object
        const configuration: any = {};

        if (stampsConfig && stampsConfig.configId) {
          configuration.stamps = {
            purchasesPerStamp: stampsConfig.purchasesPerStamp ?? 1,
            maxStampsPerTransaction: stampsConfig.maxStampsPerTransaction ?? Number.MAX_SAFE_INTEGER,
          };
        }

        if (pointsConfig && pointsConfig.configId) {
          configuration.points = {
            pointsPerCurrencyUnit: pointsConfig.pointsPerCurrencyUnit ?? 1,
            currencyUnit: pointsConfig.currencyUnit ?? 'TND',
            maxPointsPerTransaction: pointsConfig.maxPointsPerTransaction ?? Number.MAX_SAFE_INTEGER,
          };
        }

        // Get eligible rewards
        const eligibleRewards = await this.getEligibleRewards(
          connection,
          customer.customerId,
          membership.membershipId,
          business.id,
          balance,
        );

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
          },
          balance,
          program: {
            id: program.programId,
            type: program.programType,
            version: program.programVersion,
            name: program.programName,
            configuration,
          },
          eligibleRewards,
        };
      },
    );
  }

  /**
   * Calculate loyalty earnings for a purchase amount.
   * 
   * @param authenticatedUserId - The authenticated merchant's user ID
   * @param dto - DTO containing membership ID and purchase amount
   * @returns Calculated earnings and resulting balances
   */
  async calculateEarnings(
    authenticatedUserId: string,
    dto: CalculateEarningsDto,
  ): Promise<CalculateEarningsResponse> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Verify merchant owns the business
        const business = await this.businessAccess.findOwnedBusiness(
          connection,
          authenticatedUserId,
        );

        if (!business) {
          throw new NotFoundException('Business not found for this merchant');
        }

        // Verify membership belongs to this business
        const membershipResult = await connection.query<{
          businessId: string;
        }>(
          `SELECT business_id AS "businessId"
           FROM customer_business_memberships
           WHERE id = $1 AND status = 'active'
           LIMIT 1`,
          [dto.membershipId],
        );

        if (!membershipResult.rows[0]) {
          throw new NotFoundException('Membership not found or not active');
        }

        if (membershipResult.rows[0].businessId !== business.id) {
          throw new NotFoundException('Membership does not belong to this business');
        }

        // Get programme configuration using V2 structure
        const programResult = await connection.query<{ type: string; id: string }>(
          `SELECT id, type AS "programType"
           FROM programs
           WHERE business_id = $1 AND status = 'active'
           LIMIT 1`,
          [business.id],
        );

        if (!programResult.rows[0]) {
          throw new NotFoundException('No active programme found for this business');
        }

        const programType = programResult.rows[0].type as 'stamps' | 'points' | 'both';
        const programId = programResult.rows[0].id;

        // Get stamps configuration
        const stampsConfigResult = await connection.query<{
          purchasesPerStamp: number | null;
          maxStampsPerTransaction: number | null;
        }>(
          `SELECT 
             (pc.settings->'stamps'->'earningRule'->>'purchasesPerStamp')::numeric AS "purchasesPerStamp",
             (pc.settings->'stamps'->'limits'->>'maxPerTransaction')::numeric AS "maxStampsPerTransaction"
           FROM program_configurations pc
           WHERE pc.program_id = $1 AND pc.type = 'stamps'
           LIMIT 1`,
          [programId],
        );

        // Get points configuration
        const pointsConfigResult = await connection.query<{
          pointsPerCurrencyUnit: number | null;
          currencyUnit: string | null;
          maxPointsPerTransaction: number | null;
        }>(
          `SELECT 
             (pc.settings->'points'->'earningRule'->>'pointsPerCurrencyUnit')::numeric AS "pointsPerCurrencyUnit",
             pc.settings->'points'->'earningRule'->>'currencyCode' AS "currencyUnit",
             (pc.settings->'points'->'limits'->>'maxPerTransaction')::numeric AS "maxPointsPerTransaction"
           FROM program_configurations pc
           WHERE pc.program_id = $1 AND pc.type = 'points'
           LIMIT 1`,
          [programId],
        );

        const stampsConfig = stampsConfigResult.rows[0];
        const pointsConfig = pointsConfigResult.rows[0];

        // Get current balance
        const customerResult = await connection.query<{ customerId: string }>(
          `SELECT ca.user_id AS "customerId"
           FROM customer_business_memberships m
           JOIN customer_accounts ca ON ca.id = m.customer_account_id
           WHERE m.id = $1`,
          [dto.membershipId],
        );

        if (!customerResult.rows[0]) {
          throw new NotFoundException('Customer not found for membership');
        }

        const balance = await this.customerBalance.getBalance(
          customerResult.rows[0].customerId,
          dto.membershipId,
        );

        // Calculate earnings using V2 structure
        // For stamps: purchasesPerStamp means "X purchases = 1 stamp"
        //   So stampsToEarn = floor(purchaseAmount / purchasesPerStamp) for "count of purchases"
        //   OR for monetary amount: we interpret purchaseAmount as number of purchases
        // For points: pointsPerCurrencyUnit means "1 currency unit = X points"
        let stampsToEarn = 0;
        let pointsToEarn = 0;
        const calculation: any = {};

        if (programType === 'stamps' || programType === 'both') {
          const purchasesPerStamp = stampsConfig?.purchasesPerStamp ?? 1;
          const maxStamps = stampsConfig?.maxStampsPerTransaction ?? Number.MAX_SAFE_INTEGER;
          
          // purchaseAmount represents the number of purchases (visits)
          // Each purchase counts toward earning stamps
          // stampsToEarn = floor(totalPurchases / purchasesPerStamp)
          stampsToEarn = Math.floor(dto.purchaseAmount / purchasesPerStamp);
          stampsToEarn = Math.min(stampsToEarn, maxStamps);

          calculation.stamps = {
            purchasesPerStamp,
            calculation: `${dto.purchaseAmount} purchases ÷ ${purchasesPerStamp} = ${stampsToEarn} stamps`,
          };
        }

        if (programType === 'points' || programType === 'both') {
          const pointsPerCurrencyUnit = pointsConfig?.pointsPerCurrencyUnit ?? 1;
          const currencyUnit = pointsConfig?.currencyUnit ?? 'TND';
          
          // purchaseAmount represents monetary amount in currency units
          pointsToEarn = Math.floor(dto.purchaseAmount * pointsPerCurrencyUnit);
          const maxPoints = pointsConfig?.maxPointsPerTransaction ?? Number.MAX_SAFE_INTEGER;
          pointsToEarn = Math.min(pointsToEarn, maxPoints);

          calculation.points = {
            pointsPerCurrencyUnit,
            currencyUnit,
            calculation: `${dto.purchaseAmount} ${currencyUnit} × ${pointsPerCurrencyUnit} = ${pointsToEarn} points`,
          };
        }

        return {
          purchaseAmount: dto.purchaseAmount,
          stampsToEarn,
          pointsToEarn,
          totalStampsAfter: balance.stamps + stampsToEarn,
          totalPointsAfter: balance.points + pointsToEarn,
          calculation,
        };
      },
    );
  }

  /**
   * Create a loyalty transaction for a customer.
   * 
   * @param authenticatedUserId - The authenticated merchant's user ID
   * @param dto - DTO containing transaction details
   * @returns Created transaction information
   */
  async createLoyaltyTransaction(
    authenticatedUserId: string,
    dto: CreateLoyaltyTransactionDto,
  ): Promise<CreateLoyaltyTransactionResponse> {
    const idempotencyKey = dto.idempotencyKey || crypto.randomUUID();

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Get merchant's business with merchant account ID
        const sharedBusiness = await this.businessAccess.shareOwnedBusiness(
          connection,
          authenticatedUserId,
        );

        if (!sharedBusiness) {
          throw new NotFoundException('Business not found for this merchant');
        }

        const businessId = sharedBusiness.id;

        // Verify membership belongs to this business
        const membershipResult = await connection.query<{
          businessId: string;
          customerAccountId: string;
        }>(
          `SELECT 
             business_id AS "businessId",
             customer_account_id AS "customerAccountId"
           FROM customer_business_memberships
           WHERE id = $1 AND status = 'active'
           LIMIT 1`,
          [dto.membershipId],
        );

        if (!membershipResult.rows[0]) {
          throw new NotFoundException('Membership not found or not active');
        }

        if (membershipResult.rows[0].businessId !== businessId) {
          throw new NotFoundException('Membership does not belong to this business');
        }

        // Get programme configuration using V2 structure
        const programResult = await connection.query<{ id: string; type: string }>(
          `SELECT id, type
           FROM programs
           WHERE business_id = $1 AND status = 'active'
           LIMIT 1`,
          [businessId],
        );

        if (!programResult.rows[0]) {
          throw new NotFoundException('No active programme found for this business');
        }

        const programId = programResult.rows[0].id;
        const programType = programResult.rows[0].type;

        // Get programme configuration IDs and settings
        const configResult = await connection.query<{
          configId: string;
          configType: string;
          settings: unknown;
        }>(
          `SELECT id AS "configId", type AS "configType", settings
           FROM program_configurations
           WHERE program_id = $1
           ORDER BY type`,
          [programId],
        );

        const configRows = configResult.rows;
        const stampsConfig = configRows.find(r => r.configType === 'stamps');
        const pointsConfig = configRows.find(r => r.configType === 'points');

        const stampsConfigId = stampsConfig?.configId;
        const pointsConfigId = pointsConfig?.configId;

        if (!stampsConfigId && !pointsConfigId) {
          throw new NotFoundException('No programme configuration found');
        }

        // INDEPENDENTLY CALCULATE earnings - never trust frontend-supplied values
        // Read V2 configuration from settings JSONB
        let stampsToEarn = 0;
        let pointsToEarn = 0;

        if (programType === 'stamps' || programType === 'both') {
          if (stampsConfig) {
            const settings = stampsConfig.settings as Record<string, unknown>;
            const stampsSettings = settings['stamps'] as Record<string, unknown> | undefined;
            const earningRule = stampsSettings?.['earningRule'] as Record<string, unknown> | undefined;
            const limits = stampsSettings?.['limits'] as Record<string, unknown> | undefined;
            
            const purchasesPerStamp = Number(earningRule?.['purchasesPerStamp'] ?? 1);
            const maxStamps = Number(limits?.['maxPerTransaction'] ?? Number.MAX_SAFE_INTEGER);
            
            // purchaseAmount represents number of purchases/visits
            stampsToEarn = Math.floor(dto.purchaseAmount / purchasesPerStamp);
            stampsToEarn = Math.min(stampsToEarn, maxStamps);
          }
        }

        if (programType === 'points' || programType === 'both') {
          if (pointsConfig) {
            const settings = pointsConfig.settings as Record<string, unknown>;
            const pointsSettings = settings['points'] as Record<string, unknown> | undefined;
            const earningRule = pointsSettings?.['earningRule'] as Record<string, unknown> | undefined;
            const limits = pointsSettings?.['limits'] as Record<string, unknown> | undefined;
            
            const pointsPerCurrencyUnit = Number(earningRule?.['pointsPerCurrencyUnit'] ?? 1);
            const maxPoints = Number(limits?.['maxPerTransaction'] ?? Number.MAX_SAFE_INTEGER);
            
            // purchaseAmount represents monetary amount
            pointsToEarn = Math.floor(dto.purchaseAmount * pointsPerCurrencyUnit);
            pointsToEarn = Math.min(pointsToEarn, maxPoints);
          }
        }

        // Build entries for loyalty ledger
        const entries: Array<{
          activityType: 'stamps' | 'points';
          delta: number;
          programConfigurationId: string;
        }> = [];

        if (stampsToEarn > 0 && stampsConfigId) {
          entries.push({
            activityType: 'stamps',
            delta: stampsToEarn,
            programConfigurationId: stampsConfigId,
          });
        }

        if (pointsToEarn > 0 && pointsConfigId) {
          entries.push({
            activityType: 'points',
            delta: pointsToEarn,
            programConfigurationId: pointsConfigId,
          });
        }

        if (entries.length === 0) {
          throw new BadRequestException('No loyalty activity to record');
        }

        // Use loyalty ledger service to create transaction
        const result = await this.loyaltyLedger.createTransaction(
          authenticatedUserId,
          {
            membershipId: dto.membershipId,
            branchId: dto.branchId,
            category: 'purchase',
            idempotencyKey,
            occurredAt: new Date(),
            entries: entries.map((e) => ({
              activityType: e.activityType,
              delta: e.delta,
              programConfigurationId: e.programConfigurationId,
            })),
          },
        );

        // Get new balance
        const customerResult = await connection.query<{ customerId: string }>(
          `SELECT ca.user_id AS "customerId"
           FROM customer_business_memberships m
           JOIN customer_accounts ca ON ca.id = m.customer_account_id
           WHERE m.id = $1`,
          [dto.membershipId],
        );

        const balance = await this.customerBalance.getBalance(
          customerResult.rows[0].customerId,
          dto.membershipId,
        );

        return {
          transactionId: result.id,
          membershipId: dto.membershipId,
          purchaseAmount: dto.purchaseAmount,
          stampsEarned: stampsToEarn,
          pointsEarned: pointsToEarn,
          newBalance: balance,
          occurredAt: new Date().toISOString(),
          idempotencyKey,
        };
      },
    );
  }

  /**
   * Redeem a reward for a customer.
   * 
   * @param authenticatedUserId - The authenticated merchant's user ID
   * @param dto - DTO containing redemption details
   * @returns Redemption information
   */
  async redeemReward(
    authenticatedUserId: string,
    dto: RedeemRewardDto,
  ): Promise<RedeemRewardResponse> {
    const idempotencyKey = dto.idempotencyKey || crypto.randomUUID();

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Get merchant's business with merchant account ID
        const sharedBusiness = await this.businessAccess.shareOwnedBusiness(
          connection,
          authenticatedUserId,
        );

        if (!sharedBusiness) {
          throw new NotFoundException('Business not for this merchant');
        }

        const businessId = sharedBusiness.id;

        // Verify membership belongs to this business
        const membershipResult = await connection.query<{
          businessId: string;
          customerAccountId: string;
        }>(
          `SELECT 
             business_id AS "businessId",
             customer_account_id AS "customerAccountId"
           FROM customer_business_memberships
           WHERE id = $1 AND status = 'active'
           LIMIT 1`,
          [dto.membershipId],
        );

        if (!membershipResult.rows[0]) {
          throw new NotFoundException('Membership not found or not active');
        }

        if (membershipResult.rows[0].businessId !== businessId) {
          throw new NotFoundException('Membership does not belong to this business');
        }

        // Get reward information
        let reward: {
          rewardId: string;
          rewardName: string;
          pointsCost: number;
          stampsCost: number | null;
          programId: string;
        } | null = null;

        try {
          const rewardResult = await connection.query<{
            rewardId: string;
            rewardName: string;
            pointsCost: number;
            stampsCost: number | null;
            programId: string;
          }>(
            `SELECT 
               r.id AS "rewardId",
               r.name AS "rewardName",
               r.points_cost AS "pointsCost",
               r.stamps_cost AS "stampsCost",
               r.program_id AS "programId"
             FROM rewards r
             JOIN programs p ON p.id = r.program_id
             WHERE r.id = $1 AND p.business_id = $2 AND p.status = 'active' AND r.is_active = true
             LIMIT 1`,
            [dto.rewardId, businessId],
          );

          reward = rewardResult.rows[0] ?? null;
        } catch (error) {
          // Rewards table does not exist
          console.warn('[MerchantTransactionService] Rewards table not available:', error);
          reward = null;
        }

        if (!reward) {
          throw new NotFoundException('Reward not found or not available');
        }

        // Get customer ID
        const customerResult = await connection.query<{ customerId: string }>(
          `SELECT ca.user_id AS "customerId"
           FROM customer_business_memberships m
           JOIN customer_accounts ca ON ca.id = m.customer_account_id
           WHERE m.id = $1`,
          [dto.membershipId],
        );

        if (!customerResult.rows[0]) {
          throw new NotFoundException('Customer not found for membership');
        }

        // Get current balance
        const balanceBefore = await this.customerBalance.getBalance(
          customerResult.rows[0].customerId,
          dto.membershipId,
        );

        // Check if customer can afford the reward
        const canAfford =
          (reward.stampsCost === null || balanceBefore.stamps >= reward.stampsCost) &&
          balanceBefore.points >= reward.pointsCost;

        if (!canAfford) {
          throw new ConflictException('Insufficient balance for this reward');
        }

        // Get programme configuration IDs
        const configResult = await connection.query<{
          stampsConfigId: string | null;
          pointsConfigId: string | null;
        }>(
          `SELECT 
             (SELECT id FROM program_configurations 
              WHERE program_id = $1 AND type = 'stamps' LIMIT 1) AS "stampsConfigId",
             (SELECT id FROM program_configurations 
              WHERE program_id = $1 AND type = 'points' LIMIT 1) AS "pointsConfigId"`,
          [reward.programId],
        );

        const stampsConfigId = configResult.rows[0]?.stampsConfigId;
        const pointsConfigId = configResult.rows[0]?.pointsConfigId;

        // Build entries for loyalty ledger (negative values for redemption)
        const entries: Array<{
          activityType: 'stamps' | 'points';
          delta: number;
          programConfigurationId: string;
        }> = [];

        if (reward.stampsCost && reward.stampsCost > 0 && stampsConfigId) {
          entries.push({
            activityType: 'stamps',
            delta: -reward.stampsCost,
            programConfigurationId: stampsConfigId,
          });
        }

        if (reward.pointsCost && reward.pointsCost > 0 && pointsConfigId) {
          entries.push({
            activityType: 'points',
            delta: -reward.pointsCost,
            programConfigurationId: pointsConfigId,
          });
        }

        // Use loyalty ledger service to create redemption transaction
        await this.loyaltyLedger.createTransaction(
          authenticatedUserId,
          {
            membershipId: dto.membershipId,
            branchId: dto.branchId,
            category: 'manual_adjustment',
            idempotencyKey,
            occurredAt: new Date(),
            entries: entries.map((e) => ({
              activityType: e.activityType,
              delta: e.delta,
              programConfigurationId: e.programConfigurationId,
            })),
          },
        );

        // Get new balance
        const balanceAfter = await this.customerBalance.getBalance(
          customerResult.rows[0].customerId,
          dto.membershipId,
        );

        return {
          redemptionId: idempotencyKey,
          reward: {
            id: reward.rewardId,
            name: reward.rewardName,
            pointsCost: reward.pointsCost,
            stampsCost: reward.stampsCost,
          },
          customerBalanceBefore: balanceBefore,
          customerBalanceAfter: balanceAfter,
          occurredAt: new Date().toISOString(),
        };
      },
    );
  }

  private async getEligibleRewards(
    connection: PoolClient,
    customerId: string,
    membershipId: string,
    businessId: string,
    balance: { stamps: number; points: number },
  ): Promise<
    Array<{
      id: string;
      name: string;
      pointsCost: number;
      stampsCost: number | null;
      available: boolean;
    }>
  > {
    try {
      const rewardsResult = await connection.query<{
        id: string;
        name: string;
        pointsCost: number;
        stampsCost: number | null;
      }>(
        `SELECT 
           r.id,
           r.name,
           r.points_cost AS "pointsCost",
           r.stamps_cost AS "stampsCost"
         FROM rewards r
         JOIN programs p ON p.id = r.program_id
         WHERE p.business_id = $1 AND p.status = 'active' AND r.is_active = true
         ORDER BY r.points_cost ASC, r.name`,
        [businessId],
      );

      return rewardsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        pointsCost: row.pointsCost,
        stampsCost: row.stampsCost,
        available:
          (row.stampsCost === null || balance.stamps >= row.stampsCost) &&
          balance.points >= row.pointsCost,
      }));
    } catch (error) {
      // Rewards table might not exist yet
      console.warn('[MerchantTransactionService] Error getting rewards:', error);
      return [];
    }
  }
}
