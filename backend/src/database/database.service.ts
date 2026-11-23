import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as databaseSchema from './schema';

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
      // 10s covers a Neon scale-to-zero cold start.
      connectionTimeoutMillis: 10000,
    });

    // An idle client can error (e.g. the server closes it); without a listener
    // pg's 'error' event would crash the process. Log and let the pool recover.
    this.pool.on('error', (error) => {
      console.error('❌ Unexpected PostgreSQL pool error (idle client):', error);
    });

    this.db = drizzle(this.pool, { schema: databaseSchema });

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

    // Run pending migrations (development only; production uses explicit migration step)
    const env = process.env.NODE_ENV || 'development';
    const autoMigrateEnvs = ['development', 'test'];
    if (autoMigrateEnvs.includes(env)) {
      try {
        const migrationsFolder = 'src/database/migrations';
        await migrate(this.db, { migrationsFolder });
      } catch (error) {
        console.error('❌ Migration error:', error);
        // Migrations might already be applied; continue without throwing
      }
    } else if (env === 'production') {
      console.log('⚠️  Production environment: migrations must be applied via explicit deployment step (npm run db:migrate)');
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
