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
          return { rows: [{ id: 'tx-uuid-1' }] };
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
});
