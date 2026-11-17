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
export {};
//# sourceMappingURL=migrate.d.ts.map