"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const pg_1 = __importDefault(require("pg"));
const node_postgres_1 = require("drizzle-orm/node-postgres");
// Load .env from workspace root
// Search for .env in current working directory and parent directories
const findEnvPath = () => {
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
    let pool = null;
    try {
        // Create PostgreSQL connection pool using pg client
        pool = new pg_1.default.Pool({ connectionString: databaseUrl });
        console.log('🔄 Connecting to PostgreSQL...');
        const db = (0, node_postgres_1.drizzle)(pool);
        console.log('📁 Applying pending migrations from ./migrations...');
        await (0, migrator_1.migrate)(db, { migrationsFolder: './src/database/migrations' });
        console.log('✅ Migrations applied successfully');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        if (pool) {
            await pool.end();
        }
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map