import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
/**
 * Phase 1A: Database Service
 *
 * Manages PostgreSQL connection pool and Drizzle ORM instance.
 * Transaction-scoped RLS context (app.user_id) is set via TenantContextService.
 *
 * Repository pattern enforces transaction usage:
 * - Repositories receive `tx` (transaction object) only
 * - Queries execute within transaction scope
 * - RLS context set with set_config('app.user_id', userId, true)
 * - Transaction-local context auto-clears on COMMIT/ROLLBACK
 */
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool;
    private db;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Get Drizzle database instance for queries.
     * Use within TenantContextService.executeWithContext() for RLS context.
     */
    getDb(): any;
    /**
     * Get raw pool for administrative operations.
     * Avoid in transaction context.
     */
    getPool(): Pool;
}
//# sourceMappingURL=database.service.d.ts.map