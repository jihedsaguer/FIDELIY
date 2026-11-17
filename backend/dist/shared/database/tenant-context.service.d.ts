import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
/**
 * Phase 1B (Corrected): TenantContextService
 *
 * Manages transaction-local RLS context for multi-tenancy.
 * Each protected operation (guard, service) gets its own transaction.
 * No request-wide transactions or connection holding.
 *
 * Key Design:
 * - Each call to executeWithContext() acquires a fresh connection
 * - RLS context set via set_config('app.user_id', userId, true)
 * - true = transaction-scoped (auto-clears on COMMIT/ROLLBACK)
 * - Connection released immediately after transaction ends
 *
 * Security Properties:
 * - userId is authenticated principal only (never client-supplied)
 * - Queries must use provided connection (enforced by design)
 * - RLS enforces data isolation (core boundary, not just defense-in-depth)
 * - Transaction commits or rolls back before connection released
 * - Fail-safe: Missing context returns 0 rows (RLS WHERE user_id = NULL)
 *
 * Usage Pattern:
 * Guard capability check:
 *   await tenantContextService.querySingleWithContext(userId, "SELECT ...", [params])
 *
 * Service operations (multiple queries):
 *   await tenantContextService.executeWithContext(userId, async (connection) => {
 *     const result1 = await connection.query(...);
 *     const result2 = await connection.query(...);  // Same connection, same transaction
 *     return [result1, result2];
 *   })
 */
export interface TenantContextOptions {
    isolationLevel?: 'read committed' | 'serializable' | 'repeatable read';
    serializationRetries?: number;
}
export declare class TenantContextService {
    private databaseService;
    constructor(databaseService: DatabaseService);
    /**
     * Execute a query function within transaction-local RLS context.
     *
     * Acquires a PostgreSQL connection from the pool, begins a transaction,
     * sets app.user_id for RLS enforcement, executes the query function,
     * and commits or rolls back before releasing the connection.
     *
     * ALL database queries within queryFn MUST use the provided PoolClient.
     * Do NOT use the global Drizzle pool or another connection.
     *
     * @param userId Authenticated user ID (server-side principal only)
     * @param queryFn Function receiving connection; executes queries within transaction
     * @param options Transaction configuration including isolation level and retry limits
     * @returns Result of queryFn
     * @throws Error if queryFn throws or transaction fails; connection guaranteed released
     */
    executeWithContext<T>(userId: string, queryFn: (connection: PoolClient) => Promise<T>, options?: TenantContextOptions): Promise<T>;
    /**
     * Convenience method for single-query operations (typically guards).
     *
     * Wraps a single query in executeWithContext.
     * Returns the first row or null.
     *
     * @param userId Authenticated user ID
     * @param query SQL query string
     * @param params Query parameters
     * @returns First row from result set, or null
     */
    querySingleWithContext<T>(userId: string, query: string, params: any[]): Promise<T | null>;
}
//# sourceMappingURL=tenant-context.service.d.ts.map