import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { LoyaltyLedgerService } from '../../src/features/loyalty/loyalty-ledger.service';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { MerchantTransactionService } from '../../src/features/merchants/merchant-transaction.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import {
  hashCustomerQrCredential,
  hashCustomerQrShortCode,
} from '../../src/shared/security/customer-qr';

/**
 * In-memory stand-in for PostgreSQL, the only mocked boundary. It answers the
 * SQL issued by MerchantTransactionService and the real LoyaltyLedgerService,
 * scoped by the parameters each query passes (business, membership, ids).
 */
interface Tx {
  id: string;
  businessId: string;
  membershipId: string;
  branchId: string | null;
  category: string;
  occurredAt: Date;
  idempotencyKey: string;
  requestFingerprint: string;
  reversesTransactionId: string | null;
  purchaseAmountMillimes: number | null;
  reversalReason: string | null;
}

interface Entry {
  id: string;
  transactionId: string;
  activityType: 'stamps' | 'points';
  delta: number;
  programConfigurationId: string;
  reversesEntryId: string | null;
  earningRateHundredths: number | null;
}

class FakeDatabase {
  businesses = new Map<string, { id: string; merchantAccountId: string }>();
  memberships: Array<{
    id: string;
    businessId: string;
    status: string;
    customerAccountId: string;
    joinedAt?: string;
    leftAt?: string | null;
  }> = [];
  membershipEvents: Array<{ membershipId: string; type: string }> = [];
  branches: Array<{ id: string; businessId: string }> = [];
  programs: Array<{ id: string; businessId: string; type: string; version: number; name: string; status: string }> = [];
  configurations: Array<{ id: string; programId: string; type: 'stamps' | 'points'; settings: Record<string, unknown> }> = [];
  customers: Array<{ userId: string; name: string; phone: string; customerAccountId: string; credentialHash: string; shortCodeHash?: string }> = [];
  transactions: Tx[] = [];
  entries: Entry[] = [];
  private sequence = 0;

  private nextId(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private programOf(configurationId: string) {
    const configuration = this.configurations.find((c) => c.id === configurationId);
    return configuration && this.programs.find((p) => p.id === configuration.programId);
  }

  private balanceRows(membershipId: string, businessId: string) {
    const sums = new Map<string, number>();
    for (const tx of this.transactions.filter(
      (t) => t.membershipId === membershipId && t.businessId === businessId,
    )) {
      for (const entry of this.entries.filter((e) => e.transactionId === tx.id)) {
        sums.set(entry.activityType, (sums.get(entry.activityType) ?? 0) + entry.delta);
      }
    }
    return [...sums].map(([activityType, balance]) => ({ activityType, balance: String(balance) }));
  }

  query = jest.fn(async (sql: string, params: any[] = []) => {
    const rows = (value: unknown[]) => ({ rows: value });

    if (sql.includes('FROM businesses b')) {
      const business = this.businesses.get(params[0]);
      return rows(business ? [business] : []);
    }
    if (sql.includes('FROM customer_qr_credentials')) {
      return rows(
        this.customers
          .filter((c) =>
            (sql.includes('qr.short_code_hash = $1') ? c.shortCodeHash : c.credentialHash) === params[0],
          )
          .map((c) => ({
            customerId: c.userId,
            customerName: c.name,
            customerPhone: c.phone,
            customerAccountId: c.customerAccountId,
          })),
      );
    }
    if (sql.includes('INSERT INTO customer_business_memberships')) {
      if (this.memberships.some((m) => m.customerAccountId === params[0] && m.businessId === params[1])) {
        return rows([]);
      }
      const membership = {
        id: this.nextId('membership'),
        businessId: params[1],
        status: 'active',
        customerAccountId: params[0],
        joinedAt: '2026-11-22T10:00:00.000Z',
        leftAt: null,
      };
      this.memberships.push(membership);
      return rows([{ id: membership.id, joinedAt: membership.joinedAt }]);
    }
    if (sql.includes('UPDATE customer_business_memberships')) {
      const membership = this.memberships.find((m) => m.id === params[0] && m.status === 'inactive');
      if (!membership) return rows([]);
      membership.status = 'active';
      membership.leftAt = null;
      return rows([{ id: membership.id, joinedAt: membership.joinedAt ?? '2026-11-01T00:00:00.000Z' }]);
    }
    if (sql.includes('INSERT INTO membership_lifecycle_events')) {
      this.membershipEvents.push({ membershipId: params[0], type: params[1] });
      return rows([]);
    }
    if (sql.includes('FROM customer_business_memberships')) {
      if (sql.includes('customer_account_id = $1')) {
        return rows(
          this.memberships
            .filter((m) => m.customerAccountId === params[0] && m.businessId === params[1])
            .map((m) => ({
              id: m.id,
              membershipId: m.id,
              status: m.status,
              joinedAt: m.joinedAt ?? '2026-11-01T00:00:00.000Z',
            })),
        );
      }
      return rows(
        this.memberships.filter(
          (m) =>
            m.id === params[0] &&
            m.businessId === params[1] &&
            (!sql.includes("status = 'active'") || m.status === 'active'),
        ),
      );
    }
    if (sql.includes('COUNT(*)') && sql.includes('FROM branches')) {
      return rows([{ count: this.branches.filter((b) => b.businessId === params[0]).length }]);
    }
    if (sql.includes('FROM branches WHERE id = $1 AND business_id = $2')) {
      return rows(this.branches.filter((b) => b.id === params[0] && b.businessId === params[1]));
    }
    if (sql.includes('FROM programs p') && !sql.includes('program_configurations')) {
      return rows(
        this.programs
          .filter((p) => p.businessId === params[0] && p.status === 'active')
          .map((p) => ({ programId: p.id, programType: p.type, programVersion: p.version, programName: p.name })),
      );
    }
    if (sql.includes('FROM program_configurations pc')) {
      if (sql.includes('pc.settings')) {
        const byId = sql.includes('pc.id = $1');
        return rows(
          this.configurations
            .filter((c) => {
              const program = this.programOf(c.id)!;
              return byId
                ? c.id === params[0] && program.businessId === params[1] && program.status === 'active'
                : program.businessId === params[0] && program.status === 'active';
            })
            .map((c) => ({ id: c.id, type: c.type, settings: c.settings })),
        );
      }
      // LoyaltyLedgerService.validateConfigurations
      const configuration = this.configurations.find((c) => c.id === params[0] && c.type === params[1]);
      const program = configuration && this.programOf(configuration.id);
      const ok = program && program.businessId === params[2] && (!params[3] || program.status === 'active');
      return rows(ok ? [{ id: configuration!.id }] : []);
    }
    if (sql.includes('idempotency_key = $2')) {
      return rows(
        this.transactions
          .filter((t) => t.businessId === params[0] && t.idempotencyKey === params[1])
          .map((t) => ({ id: t.id, requestFingerprint: t.requestFingerprint, occurredAt: t.occurredAt })),
      );
    }
    if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
      return rows(
        this.transactions
          .filter((t) => t.id === params[0] && t.businessId === params[1] && t.membershipId === params[2])
          .map((t) => ({ id: t.id, category: t.category })),
      );
    }
    if (sql.includes('FROM loyalty_transactions WHERE id = $1 AND business_id = $2')) {
      return rows(
        this.transactions
          .filter((t) => t.id === params[0] && t.businessId === params[1])
          .map((t) => ({ id: t.id, membershipId: t.membershipId, category: t.category })),
      );
    }
    if (sql.includes('WHERE reverses_transaction_id = $1')) {
      return rows(this.transactions.filter((t) => t.reversesTransactionId === params[0]).map((t) => ({ id: t.id })));
    }
    if (sql.includes('reverses_entry_id = ANY')) {
      return rows(
        this.entries
          .filter((e) => e.reversesEntryId && params[0].includes(e.reversesEntryId))
          .map((e) => ({ reverses_entry_id: e.reversesEntryId })),
      );
    }
    if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
      return rows(this.entries.filter((e) => e.transactionId === params[0]));
    }
    if (sql.includes('FROM loyalty_activity_entries') && sql.includes('transaction_id = ANY')) {
      return rows(this.entries.filter((e) => params[0].includes(e.transactionId)));
    }
    if (sql.includes("interval '10 minutes'")) {
      const since = Date.now() - 10 * 60 * 1000;
      return rows(
        this.transactions
          .filter(
            (t) =>
              t.businessId === params[0] &&
              t.membershipId === params[1] &&
              t.category === 'purchase' &&
              t.occurredAt.getTime() > since &&
              !this.transactions.some((r) => r.reversesTransactionId === t.id),
          )
          .map((t) => ({ id: t.id })),
      );
    }
    if (sql.includes('JOIN loyalty_transactions o')) {
      // Models the summary aggregate (params: businessId, membershipId).
      const byType = new Map<string, Record<string, number>>();
      for (const t of this.transactions.filter((x) => x.businessId === params[0] && x.membershipId === params[1])) {
        const original =
          t.category === 'reversal' ? this.transactions.find((o) => o.id === t.reversesTransactionId) : undefined;
        for (const e of this.entries.filter((x) => x.transactionId === t.id)) {
          const row = byType.get(e.activityType) ?? {
            earned: 0, earningsReversed: 0, redeemed: 0, redemptionsReversed: 0, adjustments: 0, balance: 0,
          };
          row.balance += e.delta;
          if (t.category === 'purchase') row.earned += e.delta;
          else if (t.category === 'redemption') row.redeemed -= e.delta;
          else if (t.category === 'reversal' && original?.category === 'purchase') row.earningsReversed -= e.delta;
          else if (t.category === 'reversal' && original?.category === 'redemption') row.redemptionsReversed += e.delta;
          else row.adjustments += e.delta;
          byType.set(e.activityType, row);
        }
      }
      return rows([...byType].map(([activityType, v]) => ({ activityType, ...v })));
    }
    if (sql.includes('COUNT(*)') && sql.includes('FROM loyalty_transactions')) {
      return rows([
        {
          count: this.transactions.filter((t) => t.businessId === params[0] && t.membershipId === params[1]).length,
        },
      ]);
    }
    if (sql.includes('SUM(e.delta)')) {
      return rows(this.balanceRows(params[0], params[1]));
    }
    if (sql.includes('FROM loyalty_transactions t') && sql.includes('ORDER BY')) {
      return rows(
        this.transactions
          .filter((t) => t.businessId === params[0] && (params[1] === null || t.membershipId === params[1]))
          .reverse()
          .map((t) => ({
            id: t.id,
            membershipId: t.membershipId,
            branchId: t.branchId,
            category: t.category,
            occurredAt: t.occurredAt,
            purchaseAmountMillimes: t.purchaseAmountMillimes === null ? null : String(t.purchaseAmountMillimes),
            reversalReason: t.reversalReason,
            reversesTransactionId: t.reversesTransactionId,
            reversedByTransactionId:
              this.transactions.find((r) => r.reversesTransactionId === t.id)?.id ?? null,
          })),
      );
    }
    if (sql.includes('INSERT INTO loyalty_transactions')) {
      if (this.transactions.some((t) => t.businessId === params[0] && t.idempotencyKey === params[6])) {
        return rows([]);
      }
      const tx: Tx = {
        id: this.nextId('tx'),
        businessId: params[0],
        membershipId: params[1],
        branchId: params[2],
        category: params[4],
        occurredAt: params[5] ?? new Date(),
        idempotencyKey: params[6],
        requestFingerprint: params[7],
        reversesTransactionId: params[8],
        purchaseAmountMillimes: params[9],
        reversalReason: params[10],
      };
      this.transactions.push(tx);
      return rows([{ id: tx.id, occurredAt: tx.occurredAt }]);
    }
    if (sql.includes('INSERT INTO loyalty_activity_entries')) {
      const entry: Entry = {
        id: this.nextId('entry'),
        transactionId: params[0],
        activityType: params[1],
        delta: params[2],
        programConfigurationId: params[3],
        reversesEntryId: params[4],
        earningRateHundredths: params[5],
      };
      this.entries.push(entry);
      return rows([entry]);
    }
    throw new Error(`Unexpected SQL in fake database: ${sql}`);
  });
}

const MERCHANT = 'merchant-user';
const OTHER_MERCHANT = 'other-merchant-user';
const MEMBERSHIP = 'membership-1';
const QR = 'raw-customer-qr-credential';
const SHORT_QR = 'K7M2Q-9XBD4';

const stampSettings = {
  earningRule: { purchasesPerStamp: 5 },
  rewardThresholds: [
    { stampsRequired: 10, name: 'Free coffee', isActive: true },
    { stampsRequired: 3, name: 'Retired reward', isActive: false },
  ],
};
const pointSettings = {
  earningRule: { pointsPerCurrencyUnit: 2.5, currencyCode: 'TND' },
  rewardThresholds: [{ pointsRequired: 50, name: 'Discount', isActive: true }],
};

describe('MerchantTransactionService (Checkpoint 6B-C)', () => {
  let db: FakeDatabase;
  let service: MerchantTransactionService;

  function setup(programType: 'stamps' | 'points' | 'both' = 'stamps') {
    db = new FakeDatabase();
    db.businesses.set(MERCHANT, { id: 'business-1', merchantAccountId: 'merchant-account-1' });
    db.businesses.set(OTHER_MERCHANT, { id: 'business-2', merchantAccountId: 'merchant-account-2' });
    db.branches.push({ id: 'branch-1', businessId: 'business-1' });
    db.memberships.push(
      { id: MEMBERSHIP, businessId: 'business-1', status: 'active', customerAccountId: 'ca-1' },
      { id: 'membership-inactive', businessId: 'business-1', status: 'inactive', customerAccountId: 'ca-2' },
      { id: 'membership-other', businessId: 'business-2', status: 'active', customerAccountId: 'ca-1' },
    );
    db.customers.push({
      userId: 'customer-user-1',
      name: 'Amel',
      phone: '+21620000000',
      customerAccountId: 'ca-1',
      credentialHash: hashCustomerQrCredential(QR),
      shortCodeHash: hashCustomerQrShortCode(SHORT_QR),
    });
    db.programs.push(
      { id: 'program-1', businessId: 'business-1', type: programType, version: 1, name: 'Card', status: 'active' },
      { id: 'program-2', businessId: 'business-2', type: 'stamps', version: 1, name: 'Other', status: 'active' },
    );
    if (programType !== 'points') {
      db.configurations.push({ id: 'cfg-stamps', programId: 'program-1', type: 'stamps', settings: stampSettings });
    }
    if (programType !== 'stamps') {
      db.configurations.push({ id: 'cfg-points', programId: 'program-1', type: 'points', settings: pointSettings });
    }
    db.configurations.push({ id: 'cfg-other', programId: 'program-2', type: 'stamps', settings: stampSettings });

    const connection = { query: db.query } as unknown as PoolClient;
    const tenantContext = {
      executeWithContext: jest.fn(async (_userId: string, fn: (c: PoolClient) => unknown) => fn(connection)),
    } as unknown as TenantContextService;
    const businessAccess = new BusinessAccessService();
    service = new MerchantTransactionService(
      tenantContext,
      businessAccess,
      new LoyaltyLedgerService(tenantContext, businessAccess),
    );
  }

  const earn = (overrides: Record<string, unknown> = {}) =>
    service.createLoyaltyTransaction(MERCHANT, {
      membershipId: MEMBERSHIP,
      idempotencyKey: `key-${Math.random()}`,
      confirmRepeat: true,
      ...overrides,
    } as any);

  async function grantStamps(count: number) {
    for (let i = 0; i < count; i += 1) {
      await earn({ idempotencyKey: `grant-${i}`, purchaseAmount: '4.000' });
    }
  }

  describe('earning', () => {
    it('awards exactly one stamp regardless of the amount and stores the amount in millimes', async () => {
      setup('stamps');
      const result = await earn({ purchaseAmount: '250.000' });

      expect(result).toMatchObject({
        purchaseAmount: '250.000',
        stampsEarned: 1,
        pointsEarned: 0,
        newBalance: { stamps: 1, points: 0 },
      });
      expect(db.transactions[0].purchaseAmountMillimes).toBe(250000);
    });

    it('accepts a stamp-only purchase without an amount', async () => {
      setup('stamps');
      const result = await earn();
      expect(result.purchaseAmount).toBeNull();
      expect(db.transactions[0].purchaseAmountMillimes).toBeNull();
    });

    it('returns the stored occurrence time rather than the current time', async () => {
      setup('stamps');
      const result = await earn();
      expect(result.occurredAt).toBe(db.transactions[0].occurredAt.toISOString());
    });

    it.each([['0'], ['-1'], ['1.0001'], ['abc']])('rejects purchase amount %p', async (amount) => {
      setup('stamps');
      await expect(earn({ purchaseAmount: amount })).rejects.toBeInstanceOf(BadRequestException);
      expect(db.transactions).toHaveLength(0);
    });

    it('requires an amount when the programme includes points', async () => {
      setup('points');
      await expect(earn()).rejects.toThrow(
        'A purchase amount is required for programmes that include points',
      );
    });

    it('earns floor(points) with the rate snapshot stored on the entry', async () => {
      setup('points');
      const result = await earn({ purchaseAmount: '12.500' });

      expect(result).toMatchObject({ pointsEarned: 31, stampsEarned: 0, earningRate: '2.50' });
      expect(db.entries[0]).toMatchObject({ activityType: 'points', delta: 31, earningRateHundredths: 250 });
    });

    it('accumulates one stamp and points independently in a combined programme', async () => {
      setup('both');
      const result = await earn({ purchaseAmount: '0.400' });
      expect(result).toMatchObject({ stampsEarned: 1, pointsEarned: 1, newBalance: { stamps: 1, points: 1 } });
    });

    it('returns the same transaction for a retry with the same idempotency key', async () => {
      setup('both');
      const first = await earn({ idempotencyKey: 'retry-key', purchaseAmount: '10.000' });
      const second = await earn({ idempotencyKey: 'retry-key', purchaseAmount: '10.000', confirmRepeat: false });

      expect(second.transactionId).toBe(first.transactionId);
      expect(db.transactions).toHaveLength(1);
    });

    it('rejects a reused idempotency key with a different body', async () => {
      setup('both');
      await earn({ idempotencyKey: 'reused-key', purchaseAmount: '10.000' });
      await expect(
        earn({ idempotencyKey: 'reused-key', purchaseAmount: '11.000' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('warns about a repeat earning within 10 minutes unless the merchant confirms', async () => {
      setup('stamps');
      await earn({ idempotencyKey: 'first' });

      const error = await earn({ idempotencyKey: 'second', confirmRepeat: undefined }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'RECENT_EARNING_CONFIRMATION_REQUIRED',
      });

      await expect(earn({ idempotencyKey: 'second', confirmRepeat: true })).resolves.toMatchObject({
        stampsEarned: 1,
      });
    });

    it('does not warn when the recent earning was reversed', async () => {
      setup('stamps');
      const first = await earn({ idempotencyKey: 'first' });
      await service.reverseTransaction(MERCHANT, first.transactionId, {
        reason: 'Wrong customer',
        idempotencyKey: 'reverse-first',
      });
      await expect(earn({ idempotencyKey: 'second', confirmRepeat: undefined })).resolves.toMatchObject({
        stampsEarned: 1,
      });
    });

    it('requires a branch when the business has more than one branch', async () => {
      setup('stamps');
      db.branches.push({ id: 'branch-2', businessId: 'business-1' });

      await expect(earn()).rejects.toThrow(
        'A branch is required when the business has more than one branch',
      );
      await expect(earn({ branchId: 'branch-2' })).resolves.toMatchObject({ stampsEarned: 1 });
      expect(db.transactions[0].branchId).toBe('branch-2');
    });

    it('keeps the branch optional for a single-branch business but validates it when given', async () => {
      setup('stamps');
      await expect(earn()).resolves.toMatchObject({ stampsEarned: 1 });
      await expect(earn({ branchId: 'branch-of-someone-else' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a membership of another business', async () => {
      setup('stamps');
      await expect(earn({ membershipId: 'membership-other' })).rejects.toBeInstanceOf(NotFoundException);
      expect(db.transactions).toHaveLength(0);
    });

    it('rejects an inactive membership', async () => {
      setup('stamps');
      await expect(earn({ membershipId: 'membership-inactive' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('previews earnings without writing to the ledger', async () => {
      setup('both');
      const preview = await service.calculateEarnings(MERCHANT, {
        membershipId: MEMBERSHIP,
        purchaseAmount: '12.500',
      });
      expect(preview).toMatchObject({
        purchaseAmount: '12.500',
        stampsToEarn: 1,
        pointsToEarn: 31,
        earningRate: '2.50',
        totalStampsAfter: 1,
        totalPointsAfter: 31,
      });
      expect(db.transactions).toHaveLength(0);
    });
  });

  describe('redemption', () => {
    const redeem = (overrides: Record<string, unknown> = {}) =>
      service.redeemReward(MERCHANT, {
        membershipId: MEMBERSHIP,
        configurationId: 'cfg-stamps',
        rewardIndex: 0,
        idempotencyKey: `redeem-${Math.random()}`,
        ...overrides,
      } as any);

    it('deducts the stored threshold in one currency and preserves the surplus', async () => {
      setup('both');
      await grantStamps(12);
      const pointsBefore = (await service.calculateEarnings(MERCHANT, {
        membershipId: MEMBERSHIP,
        purchaseAmount: '0.001',
      })).totalPointsAfter;

      const result = await redeem();

      expect(result).toMatchObject({
        reward: { configurationId: 'cfg-stamps', rewardIndex: 0, name: 'Free coffee', activityType: 'stamps', cost: 10 },
        newBalance: { stamps: 2, points: pointsBefore },
      });
      const redemption = db.transactions.find((t) => t.category === 'redemption')!;
      expect(db.entries.filter((e) => e.transactionId === redemption.id)).toEqual([
        expect.objectContaining({ activityType: 'stamps', delta: -10, programConfigurationId: 'cfg-stamps' }),
      ]);
    });

    it('refuses when the balance is insufficient', async () => {
      setup('stamps');
      await grantStamps(9);
      await expect(redeem()).rejects.toThrow('Insufficient balance for this reward');
    });

    it('rejects an unknown reward index', async () => {
      setup('stamps');
      await grantStamps(12);
      await expect(redeem({ rewardIndex: 7 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an inactive reward', async () => {
      setup('stamps');
      await grantStamps(12);
      await expect(redeem({ rewardIndex: 1 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a configuration of another business or of an inactive programme', async () => {
      setup('stamps');
      await grantStamps(12);
      await expect(redeem({ configurationId: 'cfg-other' })).rejects.toBeInstanceOf(NotFoundException);
      db.programs[0].status = 'inactive';
      await expect(redeem()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a membership of another business', async () => {
      setup('stamps');
      await expect(redeem({ membershipId: 'membership-other' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reversal', () => {
    const reverse = (transactionId: string, overrides: Record<string, unknown> = {}, user = MERCHANT) =>
      service.reverseTransaction(user, transactionId, {
        reason: 'Entered by mistake',
        idempotencyKey: `reverse-${Math.random()}`,
        ...overrides,
      } as any);

    it('reverses an earning in full, stores the reason and restores the balance', async () => {
      setup('both');
      const earning = await earn({ purchaseAmount: '12.500' });
      const result = await reverse(earning.transactionId, { reason: '  Wrong customer  ' });

      expect(result).toMatchObject({
        reversesTransactionId: earning.transactionId,
        reason: 'Wrong customer',
        stampsDelta: -1,
        pointsDelta: -31,
        newBalance: { stamps: 0, points: 0 },
      });
      expect(db.transactions[1]).toMatchObject({ category: 'reversal', reversalReason: 'Wrong customer' });
    });

    it('returns the same reversal for a retry with the same key', async () => {
      setup('stamps');
      const earning = await earn();
      const first = await reverse(earning.transactionId, { idempotencyKey: 'rev-key' });
      const second = await reverse(earning.transactionId, { idempotencyKey: 'rev-key' });
      expect(second.transactionId).toBe(first.transactionId);
      expect(db.transactions.filter((t) => t.category === 'reversal')).toHaveLength(1);
    });

    it('rejects a second reversal with a new key', async () => {
      setup('stamps');
      const earning = await earn();
      await reverse(earning.transactionId);
      await expect(reverse(earning.transactionId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects reversing a reversal', async () => {
      setup('stamps');
      const earning = await earn();
      const reversal = await reverse(earning.transactionId);
      await expect(reverse(reversal.transactionId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to reverse an earning that was already spent, until the redemption is reversed', async () => {
      setup('stamps');
      const earnings = [];
      for (let i = 0; i < 10; i += 1) {
        earnings.push(await earn({ idempotencyKey: `spend-${i}` }));
      }
      const redemption = await service.redeemReward(MERCHANT, {
        membershipId: MEMBERSHIP,
        configurationId: 'cfg-stamps',
        rewardIndex: 0,
        idempotencyKey: 'redeem-all',
      });

      await expect(reverse(earnings[0].transactionId)).rejects.toThrow(
        'reverse the dependent redemption first',
      );

      const restored = await reverse(redemption.transactionId);
      expect(restored.newBalance).toEqual({ stamps: 10, points: 0 });
      await expect(reverse(earnings[0].transactionId)).resolves.toMatchObject({
        newBalance: { stamps: 9, points: 0 },
      });
    });

    it('returns 404 for a transaction of another business', async () => {
      setup('stamps');
      const earning = await earn();
      await expect(reverse(earning.transactionId, {}, OTHER_MERCHANT)).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([[undefined], [''], ['   '], ['x'.repeat(501)]])('requires a reason of 1-500 characters (%p)', async (reason) => {
      setup('stamps');
      const earning = await earn();
      await expect(reverse(earning.transactionId, { reason })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a reason of exactly 500 characters', async () => {
      setup('stamps');
      const earning = await earn();
      await expect(reverse(earning.transactionId, { reason: 'x'.repeat(500) })).resolves.toBeDefined();
    });
  });

  describe('history', () => {
    it('lists the business transactions with amount, reason and reversal link, filtered by membership', async () => {
      setup('both');
      const earning = await earn({ purchaseAmount: '12.500' });
      await reverse(earning.transactionId);

      const history = await service.listTransactions(MERCHANT, { membershipId: MEMBERSHIP });

      expect(history.transactions).toHaveLength(2);
      expect(history.transactions[1]).toMatchObject({
        id: earning.transactionId,
        category: 'purchase',
        purchaseAmount: '12.500',
        reversedByTransactionId: history.transactions[0].id,
        stampsDelta: 1,
        pointsDelta: 31,
      });
      expect(history.transactions[1].entries).toEqual(
        expect.arrayContaining([expect.objectContaining({ activityType: 'points', earningRate: '2.50' })]),
      );
      expect(history.transactions[0]).toMatchObject({ category: 'reversal', reversalReason: 'Entered by mistake' });

      const other = await service.listTransactions(OTHER_MERCHANT, { membershipId: MEMBERSHIP });
      expect(other.transactions).toHaveLength(0);
    });

    function reverse(transactionId: string) {
      return service.reverseTransaction(MERCHANT, transactionId, {
        reason: 'Entered by mistake',
        idempotencyKey: 'history-reverse',
      });
    }
  });

  describe('history summary (additive, membershipId only)', () => {
    const zeros = { earned: 0, earningsReversed: 0, redeemed: 0, redemptionsReversed: 0, adjustments: 0, balance: 0 };
    const summaryOf = async () => (await service.listTransactions(MERCHANT, { membershipId: MEMBERSHIP })).summary!;
    const reverse = (transactionId: string) =>
      service.reverseTransaction(MERCHANT, transactionId, { reason: 'Mistake', idempotencyKey: `sum-rev-${transactionId}` });
    const redeem = (key: string) =>
      service.redeemReward(MERCHANT, { membershipId: MEMBERSHIP, configurationId: 'cfg-stamps', rewardIndex: 0, idempotencyKey: key });

    it('returns no summary without membershipId', async () => {
      setup('stamps');
      await earn();
      const history = await service.listTransactions(MERCHANT, {});
      expect(history.summary).toBeUndefined();
      expect(history.transactions).toHaveLength(1);
    });

    it('returns zeros, the programme type and rewards for an empty history', async () => {
      setup('both');
      const summary = await summaryOf();
      expect(summary).toEqual({
        stamps: zeros,
        points: zeros,
        transactionCount: 0,
        programType: 'both',
        rewards: [
          { configurationId: 'cfg-stamps', rewardIndex: 0, name: 'Free coffee', activityType: 'stamps', cost: 10 },
          { configurationId: 'cfg-points', rewardIndex: 0, name: 'Discount', activityType: 'points', cost: 50 },
        ],
      });
    });

    it('counts earned stamps and points', async () => {
      setup('both');
      await earn({ purchaseAmount: '12.500' });
      await earn({ purchaseAmount: '4.000' });
      const summary = await summaryOf();
      expect(summary.stamps).toEqual({ ...zeros, earned: 2, balance: 2 });
      expect(summary.points).toEqual({ ...zeros, earned: 41, balance: 41 });
      expect(summary.transactionCount).toBe(2);
    });

    it('classifies the reversal of a purchase as earningsReversed', async () => {
      setup('both');
      const first = await earn({ purchaseAmount: '12.500' });
      await earn({ purchaseAmount: '4.000' });
      await reverse(first.transactionId);
      const summary = await summaryOf();
      expect(summary.stamps).toEqual({ ...zeros, earned: 2, earningsReversed: 1, balance: 1 });
      expect(summary.points).toEqual({ ...zeros, earned: 41, earningsReversed: 31, balance: 10 });
      expect(summary.transactionCount).toBe(3);
    });

    it('counts a redemption as redeemed', async () => {
      setup('stamps');
      await grantStamps(12);
      await redeem('r1');
      expect((await summaryOf()).stamps).toEqual({ ...zeros, earned: 12, redeemed: 10, balance: 2 });
    });

    it('classifies the reversal of a redemption as redemptionsReversed, not as an earning reversal', async () => {
      setup('stamps');
      await grantStamps(12);
      const redemption = await redeem('r1');
      await reverse(redemption.transactionId);
      expect((await summaryOf()).stamps).toEqual({
        ...zeros, earned: 12, redeemed: 10, redemptionsReversed: 10, balance: 12,
      });
    });

    it('keeps the invariant and equals the ledger balance for a mixed history', async () => {
      setup('both');
      const first = await earn({ purchaseAmount: '12.500' });
      for (let i = 0; i < 10; i += 1) await earn({ idempotencyKey: `mix-${i}`, purchaseAmount: '4.000' });
      const redemption = await redeem('mix-redeem');
      await reverse(redemption.transactionId);
      await reverse(first.transactionId);

      const summary = await summaryOf();
      const ledger = (await service.resolveCustomerForTransaction(MERCHANT, QR)).balance;
      for (const currency of ['stamps', 'points'] as const) {
        const s = summary[currency];
        expect(s.balance).toBe(
          s.earned - s.earningsReversed - s.redeemed + s.redemptionsReversed + s.adjustments,
        );
        expect(s.balance).toBe(ledger[currency]);
      }
      expect(summary.stamps).toMatchObject({ earned: 11, earningsReversed: 1, redeemed: 10, redemptionsReversed: 10, balance: 10 });
    });

    it('exposes adjustments so nothing is hidden', async () => {
      setup('stamps');
      await earn();
      db.transactions.push({
        id: 'tx-adj', businessId: 'business-1', membershipId: MEMBERSHIP, branchId: null, category: 'manual_adjustment',
        occurredAt: new Date(), idempotencyKey: 'adj', requestFingerprint: 'f', reversesTransactionId: null,
        purchaseAmountMillimes: null, reversalReason: null,
      });
      db.entries.push({
        id: 'entry-adj', transactionId: 'tx-adj', activityType: 'stamps', delta: 3,
        programConfigurationId: 'cfg-stamps', reversesEntryId: null, earningRateHundredths: null,
      });
      expect((await summaryOf()).stamps).toEqual({ ...zeros, earned: 1, adjustments: 3, balance: 4 });
    });

    it('is scoped by business: another merchant sees zeros and no rewards of this business', async () => {
      setup('stamps');
      await earn();
      const other = (await service.listTransactions(OTHER_MERCHANT, { membershipId: MEMBERSHIP })).summary!;
      expect(other.stamps).toEqual(zeros);
      expect(other.transactionCount).toBe(0);
      expect(other.rewards.every((r) => r.configurationId === 'cfg-other')).toBe(true);
    });

    it('covers all entries, not only the latest 100 listed', async () => {
      setup('stamps');
      await grantStamps(101);
      const history = await service.listTransactions(MERCHANT, { membershipId: MEMBERSHIP });
      expect(history.summary!.transactionCount).toBe(101);
      expect(history.summary!.stamps.earned).toBe(101);
    });

    it('keeps the existing transaction fields unchanged', async () => {
      setup('stamps');
      const earning = await earn();
      const history = await service.listTransactions(MERCHANT, { membershipId: MEMBERSHIP });
      expect(history.transactions[0]).toMatchObject({ id: earning.transactionId, category: 'purchase', stampsDelta: 1 });
    });
  });

  describe('resolve customer for transaction', () => {
    it('returns balance and rewards from the programme configuration', async () => {
      setup('stamps');
      await grantStamps(10);
      const resolved = await service.resolveCustomerForTransaction(MERCHANT, QR);

      expect(resolved.membership.id).toBe(MEMBERSHIP);
      expect(resolved.balance).toEqual({ stamps: 10, points: 0 });
      expect(resolved.rewards).toEqual([
        { configurationId: 'cfg-stamps', rewardIndex: 0, name: 'Free coffee', activityType: 'stamps', cost: 10, available: true },
      ]);
    });

    it('resolves the same customer from the short ID, however it is typed', async () => {
      setup('stamps');
      const full = await service.resolveCustomerForTransaction(MERCHANT, QR);
      for (const typed of [SHORT_QR, 'k7m2q 9xbd4', 'K7M2Q9XBD4']) {
        const resolved = await service.resolveCustomerForTransaction(MERCHANT, typed);
        expect(resolved).toEqual(full);
      }
    });

    it('treats unknown short IDs and unknown credentials alike (404)', async () => {
      setup('stamps');
      await expect(service.resolveCustomerForTransaction(MERCHANT, 'ZZZZZ-ZZZZZ')).rejects.toThrow(
        'Customer QR credential is invalid or revoked',
      );
      await expect(service.resolveCustomerForTransaction(MERCHANT, 'unknown')).rejects.toThrow(
        'Customer QR credential is invalid or revoked',
      );
    });

    describe('enrolment on scan (DECISIONS #21)', () => {
      const membershipsOf = (customerAccountId: string) =>
        db.memberships.filter((m) => m.customerAccountId === customerAccountId && m.businessId === 'business-1');

      it('enrols a non-member as an active member with one joined event and an empty card', async () => {
        setup('stamps');
        db.memberships.length = 0;
        const resolved = await service.resolveCustomerForTransaction(MERCHANT, QR);

        expect(resolved.membership.enrolment).toBe('joined');
        expect(resolved.membership.status).toBe('active');
        expect(resolved.balance).toEqual({ stamps: 0, points: 0 });
        expect(membershipsOf('ca-1')).toHaveLength(1);
        expect(membershipsOf('ca-1')[0].id).toBe(resolved.membership.id);
        expect(db.membershipEvents).toEqual([{ membershipId: resolved.membership.id, type: 'joined' }]);
        expect(db.transactions).toHaveLength(0);
      });

      it('reactivates an inactive membership on the same row with one joined event', async () => {
        setup('stamps');
        db.memberships.length = 0;
        db.memberships.push({
          id: 'membership-old',
          businessId: 'business-1',
          status: 'inactive',
          customerAccountId: 'ca-1',
          joinedAt: '2026-10-01T00:00:00.000Z',
          leftAt: '2026-10-15T00:00:00.000Z',
        });
        const resolved = await service.resolveCustomerForTransaction(MERCHANT, QR);

        expect(resolved.membership).toMatchObject({
          id: 'membership-old',
          status: 'active',
          enrolment: 'rejoined',
          joinedAt: '2026-10-01T00:00:00.000Z',
        });
        expect(db.memberships).toHaveLength(1);
        expect(db.memberships[0]).toMatchObject({ status: 'active', leftAt: null });
        expect(db.membershipEvents).toEqual([{ membershipId: 'membership-old', type: 'joined' }]);
      });

      it('writes nothing for an active member', async () => {
        setup('stamps');
        const resolved = await service.resolveCustomerForTransaction(MERCHANT, QR);

        expect(resolved.membership).toMatchObject({ id: MEMBERSHIP, enrolment: 'existing' });
        expect(db.membershipEvents).toHaveLength(0);
        expect(db.memberships).toHaveLength(3);
      });

      it('adds nothing on a repeated resolve', async () => {
        setup('stamps');
        db.memberships.length = 0;
        const first = await service.resolveCustomerForTransaction(MERCHANT, QR);
        const second = await service.resolveCustomerForTransaction(MERCHANT, QR);

        expect(second.membership.id).toBe(first.membership.id);
        expect(second.membership.enrolment).toBe('existing');
        expect(db.memberships).toHaveLength(1);
        expect(db.membershipEvents).toHaveLength(1);
      });

      it('writes no membership when the business has no active programme (404)', async () => {
        setup('stamps');
        db.memberships.length = 0;
        db.programs.forEach((p) => (p.status = 'inactive'));
        await expect(service.resolveCustomerForTransaction(MERCHANT, QR)).rejects.toBeInstanceOf(NotFoundException);

        expect(db.memberships).toHaveLength(0);
        expect(db.membershipEvents).toHaveLength(0);
      });

      it('writes nothing for an unknown or malformed code', async () => {
        setup('stamps');
        db.memberships.length = 0;
        for (const code of ['unknown', 'ZZZZZ-ZZZZZ', '']) {
          await expect(service.resolveCustomerForTransaction(MERCHANT, code)).rejects.toBeInstanceOf(NotFoundException);
        }
        expect(db.memberships).toHaveLength(0);
        expect(db.membershipEvents).toHaveLength(0);
      });

      it('enrols identically from the short ID and the full credential', async () => {
        setup('stamps');
        db.memberships.length = 0;
        const viaShort = await service.resolveCustomerForTransaction(MERCHANT, SHORT_QR);
        expect(viaShort.membership.enrolment).toBe('joined');

        const viaFull = await service.resolveCustomerForTransaction(MERCHANT, QR);
        expect(viaFull.membership.id).toBe(viaShort.membership.id);
        expect(viaFull.membership.enrolment).toBe('existing');
        expect(db.memberships).toHaveLength(1);
        expect(db.membershipEvents).toHaveLength(1);
      });

      it('lets the merchant earn right after enrolment', async () => {
        setup('stamps');
        db.memberships.length = 0;
        const resolved = await service.resolveCustomerForTransaction(MERCHANT, QR);
        const result = await service.createLoyaltyTransaction(MERCHANT, {
          membershipId: resolved.membership.id,
          idempotencyKey: 'first-earn',
          confirmRepeat: true,
        } as any);

        expect(result.newBalance.stamps).toBe(1);
      });
    });

    it('rejects an unknown credential', async () => {
      setup('stamps');
      await expect(service.resolveCustomerForTransaction(MERCHANT, 'unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
