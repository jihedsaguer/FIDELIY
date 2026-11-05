import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
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
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private db!: any;

  async onModuleInit() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool);

    // Test connection
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log(
        `✅ Database connected at: ${result.rows[0].now}`,
      );
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('✅ Database connection pool closed');
  }

  /**
   * Get Drizzle database instance for queries.
   * Use within TenantContextService.executeWithContext() for RLS context.
   */
  getDb() {
    return this.db;
  }

  /**
   * Get raw pool for administrative operations.
   * Avoid in transaction context.
   */
  getPool() {
    return this.pool;
  }
}
