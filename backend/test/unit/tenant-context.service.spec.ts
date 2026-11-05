/**
 * Phase 1B (Corrected): TenantContextService Unit Tests
 *
 * Tests actual TenantContextService.executeWithContext() and querySingleWithContext() methods.
 * Uses mocked PostgreSQL Pool to verify transaction lifecycle without live database.
 * 
 * Verifies:
 * - Connection acquired per operation
 * - Transaction opened (BEGIN)
 * - RLS context set with transaction scope (true)
 * - Query function executed with the SAME connection
 * - Transaction committed (COMMIT) or rolled back (ROLLBACK)
 * - Connection released in finally block
 * - Errors handled and re-thrown
 */

import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import { DatabaseService } from '../../src/database/database.service';
import { PoolClient } from 'pg';

describe('TenantContextService - Transaction-Bound RLS Execution', () => {
  let service: TenantContextService;
  let databaseService: any;
  let mockPool: any;
  let mockConnection: any;

  beforeEach(() => {
    // Create mock connection with flexible query return type
    mockConnection = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock all query calls to return empty result set by default
    mockConnection.query.mockResolvedValue({ rows: [] });

    // Create mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockConnection),
    };

    // Create mock DatabaseService
    databaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    };

    // Create service with mocked dependency
    service = new TenantContextService(databaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithContext - Transaction Lifecycle', () => {
    it('should invoke actual executeWithContext method with user ID and query function', async () => {
      // Act
      const result = await service.executeWithContext('user-123', async (conn) => {
        return { success: true };
      });

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('should acquire connection from pool.connect()', async () => {
      await service.executeWithContext('user-123', async () => {});

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
    });

    it('should execute BEGIN to start transaction', async () => {
      await service.executeWithContext('user-123', async () => {});

      const beginCall = mockConnection.query.mock.calls.find(
        (call: any) => call[0] === 'BEGIN',
      );
      expect(beginCall).toBeDefined();
    });

    it('should set RLS context with set_config using transaction scope (true)', async () => {
      await service.executeWithContext('user-123', async () => {});

      const setConfigCall = mockConnection.query.mock.calls.find(
        (call: any) =>
          typeof call[0] === 'string' &&
          call[0].includes("set_config('app.user_id'"),
      );

      expect(setConfigCall).toBeDefined();
      expect(setConfigCall?.[0]).toContain("set_config('app.user_id'");
      expect(setConfigCall?.[1]).toEqual(['user-123']);
      expect(setConfigCall?.[0]).toContain(', true)'); // transaction scope
    });

    it('should pass the same connection to query function', async () => {
      let receivedConnection: PoolClient | null = null;

      await service.executeWithContext('user-123', async (conn) => {
        receivedConnection = conn;
      });

      expect(receivedConnection).toBe(mockConnection);
    });

    it('should execute COMMIT after successful query function', async () => {
      await service.executeWithContext('user-123', async () => {
        return { data: 'test' };
      });

      const commitCall = mockConnection.query.mock.calls.find(
        (call: any) => call[0] === 'COMMIT',
      );
      expect(commitCall).toBeDefined();
    });

    it('should release connection after successful execution', async () => {
      await service.executeWithContext('user-123', async () => {});

      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('should execute ROLLBACK when query function throws error', async () => {
      const testError = new Error('Query failed');

      try {
        await service.executeWithContext('user-123', async () => {
          throw testError;
        });
      } catch (e) {
        // Expected to throw
      }

      const rollbackCall = mockConnection.query.mock.calls.find(
        (call: any) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCall).toBeDefined();
    });

    it('should release connection even when error occurs', async () => {
      try {
        await service.executeWithContext('user-123', async () => {
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected
      }

      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('should re-throw original error after rollback', async () => {
      const originalError = new Error('Original query error');

      try {
        await service.executeWithContext('user-123', async () => {
          throw originalError;
        });
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBe(originalError);
      }
    });

    it('should return result from query function', async () => {
      const expectedResult = { id: '123', name: 'Test' };

      const result = await service.executeWithContext('user-123', async () => {
        return expectedResult;
      });

      expect(result).toEqual(expectedResult);
    });
  });

  describe('querySingleWithContext - Guard Query Pattern', () => {
    it('should invoke actual querySingleWithContext method', async () => {
      mockConnection.query.mockResolvedValueOnce({
        rows: [{ id: 'account-123' }],
      });

      const result = await service.querySingleWithContext<{ id: string }>(
        'user-123',
        'SELECT id FROM customer_accounts WHERE user_id = $1',
        ['user-123'],
      );

      expect(result).toEqual({ id: 'account-123' });
    });

    it('should execute provided SQL query with parameters', async () => {
      mockConnection.query.mockResolvedValueOnce({
        rows: [{ id: 'merchant-456' }],
      });

      await service.querySingleWithContext<{ id: string }>(
        'user-123',
        'SELECT id FROM merchant_accounts WHERE user_id = $1',
        ['user-123'],
      );

      const queryCall = mockConnection.query.mock.calls.find(
        (call: any) =>
          typeof call[0] === 'string' &&
          call[0].includes('SELECT id FROM merchant_accounts'),
      );
      expect(queryCall).toBeDefined();
      expect(queryCall?.[1]).toEqual(['user-123']);
    });

    it('should return first row from result set', async () => {
      mockConnection.query.mockResolvedValueOnce({
        rows: [{ id: 'row1' }, { id: 'row2' }],
      });

      const result = await service.querySingleWithContext<{ id: string }>(
        'user-123',
        'SELECT id FROM accounts',
        [],
      );

      expect(result).toEqual({ id: 'row1' });
    });

    it('should return null when no rows found', async () => {
      mockConnection.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.querySingleWithContext<{ id: string }>(
        'user-123',
        'SELECT id FROM accounts WHERE user_id = $1',
        ['user-999'],
      );

      expect(result).toBeNull();
    });
  });

  describe('Error Handling Guarantees', () => {
    it('should handle release errors gracefully', async () => {
      mockConnection.release.mockImplementationOnce(() => {
        throw new Error('Release failed');
      });

      const result = await service.executeWithContext('user-123', async () => ({
        ok: true,
      }));

      expect(result).toEqual({ ok: true });
    });

    it('should handle ROLLBACK errors gracefully and preserve original error', async () => {
      const originalError = new Error('Query error');

      mockConnection.query.mockImplementationOnce(
        async (sql: string) => {
          if (sql === 'ROLLBACK') {
            throw new Error('Rollback failed');
          }
          return { rows: [] };
        },
      );

      try {
        await service.executeWithContext('user-123', async () => {
          throw originalError;
        });
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBe(originalError);
      }
    });
  });
});
