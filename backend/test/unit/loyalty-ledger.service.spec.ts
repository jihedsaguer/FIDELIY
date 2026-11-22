import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  LoyaltyLedgerService,
  CreateLoyaltyTransaction,
} from '../../src/features/loyalty/loyalty-ledger.service';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';

describe('LoyaltyLedgerService - Internal Foundation Unit Tests', () => {
  let service: LoyaltyLedgerService;
  let query: jest.Mock;
  let connection: { query: jest.Mock };
  let tenantContext: { executeWithContext: jest.Mock };

  beforeEach(() => {
    query = jest.fn();
    connection = { query };
    tenantContext = {
      executeWithContext: jest.fn(
        async (
          _userId: string,
          operation: (client: PoolClient) => unknown,
          _options?: unknown,
        ) => operation(connection as unknown as PoolClient),
      ),
    };
    service = new LoyaltyLedgerService(
      tenantContext as unknown as TenantContextService,
      new BusinessAccessService(),
    );
  });

  const validTransactionInput: CreateLoyaltyTransaction = {
    membershipId: 'membership-uuid-1',
    category: 'purchase',
    idempotencyKey: 'idemp-key-12345',
    entries: [
      {
        activityType: 'stamps',
        delta: 1,
        programConfigurationId: 'prog-config-uuid-1',
      },
    ],
  };

  describe('Input Validation', () => {
    it('rejects empty idempotency key', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          idempotencyKey: '',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects idempotency key exceeding 128 characters', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          idempotencyKey: 'x'.repeat(129),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects transaction with no entries', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          entries: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects zero delta in activity entry', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          entries: [
            {
              activityType: 'stamps',
              delta: 0,
              programConfigurationId: 'prog-config-uuid-1',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-integer delta', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          entries: [
            {
              activityType: 'points',
              delta: 10.5,
              programConfigurationId: 'prog-config-uuid-1',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reversal category without reversesTransactionId', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          category: 'reversal',
          reversesTransactionId: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-reversal category with reversesTransactionId', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          category: 'purchase',
          reversesTransactionId: 'some-other-uuid',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Transaction Creation and Execution', () => {
    it('creates a transaction header and activity entries with serializable isolation', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('idempotency_key = $2')) {
          return { rows: [] }; // No existing transaction for this idempotency key
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('INSERT INTO loyalty_transactions')) {
          return {
            rows: [{ id: 'tx-uuid-1', occurredAt: new Date('2026-11-21T10:00:00Z') }],
          };
        }
        if (sql.includes('INSERT INTO loyalty_activity_entries')) {
          return {
            rows: [
              {
                id: 'entry-uuid-1',
                activityType: 'stamps',
                delta: 1,
                programConfigurationId: 'prog-config-uuid-1',
                reversesEntryId: null,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.createTransaction('user-1', validTransactionInput);

      expect(result).toEqual({
        id: 'tx-uuid-1',
        occurredAt: new Date('2026-11-21T10:00:00Z'),
        balance: { stamps: 1, points: 0 },
        entries: [
          {
            id: 'entry-uuid-1',
            activityType: 'stamps',
            delta: 1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: null,
          },
        ],
      });

      expect(tenantContext.executeWithContext).toHaveBeenCalledWith(
        'user-1',
        expect.any(Function),
        { isolationLevel: 'serializable', serializationRetries: 3 },
      );
    });

    it('keeps the merchant not-found message when no business exists', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(
        service.createTransaction('user-1', validTransactionInput),
      ).rejects.toThrow('Business not found for this merchant');
    });

    it('validates branch belongs to business when branchId is provided', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('idempotency_key = $2')) {
          return { rows: [] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM branches WHERE id = $1 AND business_id = $2')) {
          return { rows: [] }; // Branch not found for this business
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          branchId: 'branch-nonexistent',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when referenced program configuration is incompatible with activity type or inactive', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('idempotency_key = $2')) {
          return { rows: [] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [] }; // Inactive or wrong type
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', validTransactionInput),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Idempotency Semantics', () => {
    it('returns original recorded transaction outcome when replaying with same key and payload', async () => {
      let fingerprintCaptured = '';

      query.mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('INSERT INTO loyalty_transactions')) {
          fingerprintCaptured = params[7] as string;
          return { rows: [{ id: 'tx-uuid-1' }] };
        }
        if (sql.includes('FROM loyalty_transactions WHERE business_id = $1 AND idempotency_key = $2')) {
          // Return existing transaction with the captured fingerprint
          return {
            rows: [
              {
                id: 'tx-uuid-1',
                requestFingerprint: fingerprintCaptured,
              },
            ],
          };
        }
        if (sql.includes('FROM loyalty_activity_entries WHERE transaction_id = $1')) {
          return {
            rows: [
              {
                id: 'entry-uuid-1',
                activityType: 'stamps',
                delta: 1,
                programConfigurationId: 'prog-config-uuid-1',
                reversesEntryId: null,
              },
            ],
          };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('INSERT INTO loyalty_activity_entries')) {
          return {
            rows: [
              {
                id: 'entry-uuid-1',
                activityType: 'stamps',
                delta: 1,
                programConfigurationId: 'prog-config-uuid-1',
                reversesEntryId: null,
              },
            ],
          };
        }
        return { rows: [] };
      });

      // First call inserts
      const first = await service.createTransaction('user-1', validTransactionInput);
      expect(first.id).toBe('tx-uuid-1');

      // Second call with same idempotency key and payload returns existing without re-inserting
      const second = await service.createTransaction('user-1', validTransactionInput);
      expect(second.id).toBe('tx-uuid-1');
      expect(second.entries).toEqual(first.entries);
    });

    it('rejects with ConflictException when same idempotency key is used with a different payload', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('idempotency_key = $2')) {
          return {
            rows: [
              {
                id: 'tx-uuid-1',
                requestFingerprint: 'different-fingerprint-ffffffffffffffffffffffffffffffffffffffffff',
              },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', validTransactionInput),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Reversal Validation', () => {
    it('validates original transaction and entries for a full reversal with exact inverse delta', async () => {
      const reversalInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-key-1',
        reversesTransactionId: 'orig-tx-uuid-1',
        reversalReason: 'Wrong customer',
        entries: [
          {
            activityType: 'stamps',
            delta: -1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'orig-entry-uuid-1',
          },
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('idempotency_key = $2')) {
          return { rows: [] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          // Reversal allows historical/inactive configuration
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('FROM loyalty_transactions') && sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: [{ id: 'orig-tx-uuid-1', category: 'purchase' }] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          return { rows: [] }; // Not already reversed
        }
        if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
          return {
            rows: [
              {
                id: 'orig-entry-uuid-1',
                activityType: 'stamps',
                delta: 1, // Original was +1
                programConfigurationId: 'prog-config-uuid-1',
              },
            ],
          };
        }
        if (sql.includes('WHERE reverses_entry_id = ANY')) {
          return { rows: [] }; // Entries not yet reversed
        }
        if (sql.includes('SUM(e.delta)')) {
          return { rows: [{ activityType: 'stamps', balance: '1' }] }; // Earned stamp not spent
        }
        if (sql.includes('INSERT INTO loyalty_transactions')) {
          return { rows: [{ id: 'rev-tx-uuid-1' }] };
        }
        if (sql.includes('INSERT INTO loyalty_activity_entries')) {
          return {
            rows: [
              {
                id: 'rev-entry-uuid-1',
                activityType: 'stamps',
                delta: -1,
                programConfigurationId: 'prog-config-uuid-1',
                reversesEntryId: 'orig-entry-uuid-1',
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.createTransaction('user-1', reversalInput);
      expect(result.id).toBe('rev-tx-uuid-1');
      expect(result.entries[0].delta).toBe(-1);
      expect(result.entries[0].reversesEntryId).toBe('orig-entry-uuid-1');
    });

    it('rejects reversal when entry reversesEntryId is omitted', async () => {
      const invalidReversalInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-key-2',
        reversesTransactionId: 'orig-tx-uuid-1',
        reversalReason: 'Test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: -1,
            programConfigurationId: 'prog-config-uuid-1',
            // reversesEntryId missing
          },
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: [{ id: 'orig-tx-uuid-1', category: 'purchase' }] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          return { rows: [] };
        }
        if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
          return {
            rows: [
              {
                id: 'orig-entry-uuid-1',
                activityType: 'stamps',
                delta: 1,
                programConfigurationId: 'prog-config-uuid-1',
              },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', invalidReversalInput),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate reversal when original transaction has already been reversed', async () => {
      const reversalInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-key-dup',
        reversesTransactionId: 'orig-tx-uuid-1',
        reversalReason: 'Test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: -1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'orig-entry-uuid-1',
          },
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: [{ id: 'orig-tx-uuid-1', category: 'purchase' }] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          // Already reversed!
          return { rows: [{ id: 'earlier-reversal-uuid' }] };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', reversalInput),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects reversal when delta is not the exact inverse of original delta', async () => {
      const wrongDeltaInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-wrong-delta',
        reversesTransactionId: 'orig-tx-uuid-1',
        reversalReason: 'Test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: -2, // Original is +1, so -2 is invalid
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'orig-entry-uuid-1',
          },
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: [{ id: 'orig-tx-uuid-1', category: 'purchase' }] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          return { rows: [] };
        }
        if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
          return {
            rows: [
              {
                id: 'orig-entry-uuid-1',
                activityType: 'stamps',
                delta: 1, // Original delta is +1
                programConfigurationId: 'prog-config-uuid-1',
              },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', wrongDeltaInput),
      ).rejects.toThrow('Reversal entry delta must be the exact inverse of the original entry delta');
    });

    it('rejects reversing a transaction that is itself a reversal', async () => {
      const reversalInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-of-reversal',
        reversesTransactionId: 'orig-reversal-tx-uuid',
        reversalReason: 'Test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: 1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'orig-entry-uuid-1',
          },
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          // Original transaction is itself a reversal!
          return { rows: [{ id: 'orig-reversal-tx-uuid', category: 'reversal' }] };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', reversalInput),
      ).rejects.toThrow('Cannot reverse a reversal transaction');
    });

    it('rejects partial reversal when entry count does not match original transaction', async () => {
      const partialReversalInput: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'reversal-partial',
        reversesTransactionId: 'orig-tx-uuid-1',
        reversalReason: 'Test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: -1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'orig-entry-uuid-1',
          },
          // Missing second entry!
        ],
      };

      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'prog-config-uuid-1' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: [{ id: 'orig-tx-uuid-1', category: 'purchase' }] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          return { rows: [] };
        }
        if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
          return {
            rows: [
              {
                id: 'orig-entry-uuid-1',
                activityType: 'stamps',
                delta: 1,
                programConfigurationId: 'prog-config-uuid-1',
              },
              {
                id: 'orig-entry-uuid-2',
                activityType: 'points',
                delta: 50,
                programConfigurationId: 'prog-config-uuid-2',
              },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(
        service.createTransaction('user-1', partialReversalInput),
      ).rejects.toThrow('Full reversal must reverse all entries of the original transaction');
    });

    it('rejects when non-reversal transaction passes reversesEntryId', async () => {
      const purchaseWithReversalEntry: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'purchase',
        idempotencyKey: 'purchase-with-rev-entry',
        entries: [
          {
            activityType: 'stamps',
            delta: 1,
            programConfigurationId: 'prog-config-uuid-1',
            reversesEntryId: 'some-entry-id',
          },
        ],
      };

      await expect(
        service.createTransaction('user-1', purchaseWithReversalEntry),
      ).rejects.toThrow('Only reversal transactions may reference a reversal entry');
    });
  });

  describe('Checkpoint 6B-C: amount, rate snapshot, reason, balance and repeat rules', () => {
    interface FakeLedgerState {
      balance?: Array<{ activityType: string; balance: string }>;
      recentEarning?: boolean;
      existing?: { id: string; requestFingerprint: string; occurredAt: Date };
      original?: { category: string; entries: Array<Record<string, unknown>> };
    }

    let insertedTransactionParams: unknown[] | undefined;
    let insertedEntryParams: unknown[][];

    function fakeLedger(state: FakeLedgerState = {}) {
      insertedTransactionParams = undefined;
      insertedEntryParams = [];
      query.mockImplementation(async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM businesses b')) {
          return { rows: [{ id: 'business-1', merchantAccountId: 'merchant-account-1' }] };
        }
        if (sql.includes('idempotency_key = $2')) {
          return { rows: state.existing ? [state.existing] : [] };
        }
        if (sql.includes('FROM customer_business_memberships')) {
          return { rows: [{ id: 'membership-uuid-1' }] };
        }
        if (sql.includes('FROM program_configurations pc')) {
          return { rows: [{ id: 'cfg' }] };
        }
        if (sql.includes('WHERE id = $1 AND business_id = $2 AND membership_id = $3')) {
          return { rows: state.original ? [{ id: 'orig-tx', category: state.original.category }] : [] };
        }
        if (sql.includes('WHERE reverses_transaction_id = $1')) {
          return { rows: [] };
        }
        if (sql.includes('FROM loyalty_activity_entries') && sql.includes('WHERE transaction_id = $1')) {
          return { rows: state.original?.entries ?? [] };
        }
        if (sql.includes("interval '10 minutes'")) {
          return { rows: state.recentEarning ? [{ id: 'recent-tx' }] : [] };
        }
        if (sql.includes('SUM(e.delta)')) {
          return { rows: state.balance ?? [] };
        }
        if (sql.includes('INSERT INTO loyalty_transactions')) {
          insertedTransactionParams = params;
          return { rows: [{ id: 'tx-new', occurredAt: new Date('2026-11-21T09:30:00Z') }] };
        }
        if (sql.includes('INSERT INTO loyalty_activity_entries')) {
          insertedEntryParams.push(params);
          return {
            rows: [
              {
                id: `entry-${insertedEntryParams.length}`,
                activityType: params[1],
                delta: params[2],
                programConfigurationId: params[3],
                reversesEntryId: params[4],
                earningRateHundredths: params[5],
              },
            ],
          };
        }
        return { rows: [] };
      });
    }

    const pointsPurchase: CreateLoyaltyTransaction = {
      membershipId: 'membership-uuid-1',
      category: 'purchase',
      idempotencyKey: 'purchase-points-1',
      purchaseAmountMillimes: 12500,
      entries: [
        { activityType: 'stamps', delta: 1, programConfigurationId: 'cfg-stamps' },
        {
          activityType: 'points',
          delta: 31,
          programConfigurationId: 'cfg-points',
          earningRateHundredths: 250,
        },
      ],
    };

    it('stores the purchase amount on the header and the rate snapshot on the points entry', async () => {
      fakeLedger({ balance: [{ activityType: 'points', balance: '9' }] });

      const result = await service.createTransaction('user-1', pointsPurchase);

      expect(insertedTransactionParams?.[9]).toBe(12500);
      expect(insertedTransactionParams?.[10]).toBeNull();
      expect(insertedEntryParams.map((p) => p[5])).toEqual([null, 250]);
      expect(result.occurredAt).toEqual(new Date('2026-11-21T09:30:00Z'));
      expect(result.balance).toEqual({ stamps: 1, points: 40 });
    });

    it('rejects a points earning without a purchase amount', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...pointsPurchase,
          purchaseAmountMillimes: undefined,
        }),
      ).rejects.toThrow('A purchase amount is required for points earnings');
    });

    it('rejects a points earning without an earning-rate snapshot', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...pointsPurchase,
          entries: [
            { activityType: 'points', delta: 31, programConfigurationId: 'cfg-points' },
          ],
        }),
      ).rejects.toThrow('Points earnings require an earning-rate snapshot');
    });

    it('rejects an earning-rate snapshot on a stamps entry', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          entries: [
            {
              activityType: 'stamps',
              delta: 1,
              programConfigurationId: 'cfg',
              earningRateHundredths: 100,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a purchase amount on a non-purchase transaction', async () => {
      await expect(
        service.createTransaction('user-1', {
          membershipId: 'membership-uuid-1',
          category: 'redemption',
          idempotencyKey: 'redeem-amount',
          purchaseAmountMillimes: 1000,
          entries: [{ activityType: 'stamps', delta: -10, programConfigurationId: 'cfg' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([[undefined], [''], ['   '], ['x'.repeat(501)]])(
      'requires a reversal reason of 1 to 500 characters (%p rejected)',
      async (reason) => {
        await expect(
          service.createTransaction('user-1', {
            membershipId: 'membership-uuid-1',
            category: 'reversal',
            idempotencyKey: 'rev-reason',
            reversesTransactionId: 'orig-tx',
            reversalReason: reason,
            entries: [
              {
                activityType: 'stamps',
                delta: -1,
                programConfigurationId: 'cfg',
                reversesEntryId: 'orig-entry',
              },
            ],
          }),
        ).rejects.toThrow('A reversal reason of 1 to 500 characters is required');
      },
    );

    it('rejects a reason on a transaction that is not a reversal', async () => {
      await expect(
        service.createTransaction('user-1', {
          ...validTransactionInput,
          reversalReason: 'not allowed',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('includes the purchase amount in the idempotency fingerprint', async () => {
      fakeLedger();
      await service.createTransaction('user-1', pointsPurchase);
      const fingerprint = insertedTransactionParams?.[7] as string;

      fakeLedger({
        existing: { id: 'tx-new', requestFingerprint: fingerprint, occurredAt: new Date() },
      });
      await expect(
        service.createTransaction('user-1', { ...pointsPurchase, purchaseAmountMillimes: 12600 }),
      ).rejects.toThrow('Idempotency key was already used with a different request');
    });

    it('includes the earning-rate snapshot in the idempotency fingerprint', async () => {
      fakeLedger();
      await service.createTransaction('user-1', pointsPurchase);
      const fingerprint = insertedTransactionParams?.[7] as string;

      fakeLedger({
        existing: { id: 'tx-new', requestFingerprint: fingerprint, occurredAt: new Date() },
      });
      await expect(
        service.createTransaction('user-1', {
          ...pointsPurchase,
          entries: [
            pointsPurchase.entries[0],
            { ...pointsPurchase.entries[1], earningRateHundredths: 251 },
          ],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('includes the reversal reason in the idempotency fingerprint', async () => {
      const reversal: CreateLoyaltyTransaction = {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'rev-fp',
        reversesTransactionId: 'orig-tx',
        reversalReason: 'First reason',
        entries: [
          { activityType: 'stamps', delta: -1, programConfigurationId: 'cfg', reversesEntryId: 'orig-entry' },
        ],
      };
      fakeLedger({
        balance: [{ activityType: 'stamps', balance: '1' }],
        original: {
          category: 'purchase',
          entries: [{ id: 'orig-entry', activityType: 'stamps', delta: 1, programConfigurationId: 'cfg' }],
        },
      });
      await service.createTransaction('user-1', reversal);
      const fingerprint = insertedTransactionParams?.[7] as string;

      fakeLedger({
        existing: { id: 'tx-new', requestFingerprint: fingerprint, occurredAt: new Date() },
      });
      await expect(
        service.createTransaction('user-1', { ...reversal, reversalReason: 'Other reason' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.createTransaction('user-1', reversal)).resolves.toMatchObject({
        id: 'tx-new',
      });
    });

    it('keeps the repeat confirmation out of the fingerprint and returns the stored transaction on retry', async () => {
      fakeLedger();
      await service.createTransaction('user-1', {
        ...pointsPurchase,
        repeatEarning: { confirmed: true },
      });
      const fingerprint = insertedTransactionParams?.[7] as string;
      const storedAt = new Date('2026-11-21T09:30:00Z');

      fakeLedger({
        recentEarning: true,
        existing: { id: 'tx-new', requestFingerprint: fingerprint, occurredAt: storedAt },
      });
      const retry = await service.createTransaction('user-1', {
        ...pointsPurchase,
        repeatEarning: { confirmed: false },
      });
      expect(retry.id).toBe('tx-new');
      expect(retry.occurredAt).toEqual(storedAt);
      expect(insertedTransactionParams).toBeUndefined();
    });

    it('requires explicit confirmation when the membership earned in the previous 10 minutes', async () => {
      fakeLedger({ recentEarning: true });

      const error = await service
        .createTransaction('user-1', { ...pointsPurchase, repeatEarning: { confirmed: false } })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'RECENT_EARNING_CONFIRMATION_REQUIRED',
      });
      expect(insertedTransactionParams).toBeUndefined();
    });

    it('records the earning when the merchant confirms the repeat', async () => {
      fakeLedger({ recentEarning: true });
      const result = await service.createTransaction('user-1', {
        ...pointsPurchase,
        repeatEarning: { confirmed: true },
      });
      expect(result.id).toBe('tx-new');
    });

    it('does not run the repeat check unless the caller asks for it', async () => {
      fakeLedger({ recentEarning: true });
      await expect(service.createTransaction('user-1', pointsPurchase)).resolves.toMatchObject({
        id: 'tx-new',
      });
    });

    it('deducts a redemption in one currency and preserves the surplus', async () => {
      fakeLedger({ balance: [{ activityType: 'stamps', balance: '12' }, { activityType: 'points', balance: '50' }] });
      const result = await service.createTransaction('user-1', {
        membershipId: 'membership-uuid-1',
        category: 'redemption',
        idempotencyKey: 'redeem-1',
        entries: [{ activityType: 'stamps', delta: -10, programConfigurationId: 'cfg' }],
      });
      expect(insertedTransactionParams?.[4]).toBe('redemption');
      expect(result.balance).toEqual({ stamps: 2, points: 50 });
    });

    it('refuses a redemption when the balance is insufficient', async () => {
      fakeLedger({ balance: [{ activityType: 'stamps', balance: '9' }] });
      await expect(
        service.createTransaction('user-1', {
          membershipId: 'membership-uuid-1',
          category: 'redemption',
          idempotencyKey: 'redeem-2',
          entries: [{ activityType: 'stamps', delta: -10, programConfigurationId: 'cfg' }],
        }),
      ).rejects.toThrow('Insufficient balance for this reward');
      expect(insertedTransactionParams).toBeUndefined();
    });

    it('refuses to reverse an earning that has already been spent', async () => {
      fakeLedger({
        balance: [{ activityType: 'stamps', balance: '0' }],
        original: {
          category: 'purchase',
          entries: [{ id: 'orig-entry', activityType: 'stamps', delta: 1, programConfigurationId: 'cfg' }],
        },
      });
      await expect(
        service.createTransaction('user-1', {
          membershipId: 'membership-uuid-1',
          category: 'reversal',
          idempotencyKey: 'rev-spent',
          reversesTransactionId: 'orig-tx',
          reversalReason: 'Entered twice',
          entries: [
            { activityType: 'stamps', delta: -1, programConfigurationId: 'cfg', reversesEntryId: 'orig-entry' },
          ],
        }),
      ).rejects.toThrow('reverse the dependent redemption first');
      expect(insertedTransactionParams).toBeUndefined();
    });

    it('stores the reason on a reversal and restores a redeemed balance', async () => {
      fakeLedger({
        balance: [{ activityType: 'stamps', balance: '2' }],
        original: {
          category: 'redemption',
          entries: [{ id: 'orig-entry', activityType: 'stamps', delta: -10, programConfigurationId: 'cfg' }],
        },
      });
      const result = await service.createTransaction('user-1', {
        membershipId: 'membership-uuid-1',
        category: 'reversal',
        idempotencyKey: 'rev-redemption',
        reversesTransactionId: 'orig-tx',
        reversalReason: 'Reward not handed over',
        entries: [
          { activityType: 'stamps', delta: 10, programConfigurationId: 'cfg', reversesEntryId: 'orig-entry' },
        ],
      });
      expect(insertedTransactionParams?.[10]).toBe('Reward not handed over');
      expect(result.balance).toEqual({ stamps: 12, points: 0 });
    });
  });
});
