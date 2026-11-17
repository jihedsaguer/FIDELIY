"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const pg_1 = require("pg");
const databaseSchema = __importStar(require("./schema"));
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
let DatabaseService = class DatabaseService {
    async onModuleInit() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        this.pool = new pg_1.Pool({
            connectionString,
            max: 20, // Connection pool size
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.db = (0, node_postgres_1.drizzle)(this.pool, { schema: databaseSchema });
        // Test connection
        try {
            const result = await this.pool.query('SELECT NOW()');
            console.log(`✅ Database connected at: ${result.rows[0].now}`);
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
        // Run pending migrations (development only; production uses explicit migration step)
        const env = process.env.NODE_ENV || 'development';
        const autoMigrateEnvs = ['development', 'test'];
        if (autoMigrateEnvs.includes(env)) {
            try {
                const migrationsFolder = 'src/database/migrations';
                await (0, migrator_1.migrate)(this.db, { migrationsFolder });
            }
            catch (error) {
                console.error('❌ Migration error:', error);
                // Migrations might already be applied; continue without throwing
            }
        }
        else if (env === 'production') {
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
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map