/**
 * FIDELIY Database Migration Runner
 *
 * Applies pending migrations from the migrations directory to PostgreSQL.
 * Uses drizzle-orm migrate() function for transaction-safe application.
 *
 * Usage:
 *   npm run db:migrate
 *   OR from workspace root: npm --prefix backend run db:migrate
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string (required; loaded from .env)
 *
 * Implementation:
 * - Loads .env via dotenv (path: ../.env from backend directory)
 * - Uses native pg client (already a dependency)
 * - Drizzle-kit generates migrations as SQL files in ./migrations
 * - migrate() executes them in sequence with transaction safety
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Load .env from workspace root
// Search for .env in current working directory and parent directories
const findEnvPath = (): string | null => {
  let currentDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
};

const envPath = findEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
}

async function runMigrations() {
  // Validate DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  let pool: pg.Pool | null = null;

  try {
    // Create PostgreSQL connection pool using pg client
    pool = new pg.Pool({ connectionString: databaseUrl });

    console.log('🔄 Connecting to PostgreSQL...');
    const db = drizzle(pool);

    console.log('📁 Applying pending migrations from ./migrations...');
    await migrate(db, { migrationsFolder: './src/database/migrations' });

    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

runMigrations();
