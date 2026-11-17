"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
let TenantContextService = class TenantContextService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
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
    async executeWithContext(userId, queryFn, options = {}) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('userId must be a non-empty string');
        }
        const isolationLevel = options.isolationLevel ?? 'read committed';
        const serializationRetries = isolationLevel === 'serializable'
            ? (options.serializationRetries ?? 3)
            : 0;
        if (!Number.isInteger(serializationRetries) ||
            serializationRetries < 0 ||
            serializationRetries > 5) {
            throw new RangeError('serializationRetries must be an integer between 0 and 5');
        }
        const pool = this.databaseService.getPool();
        let attempt = 0;
        while (true) {
            let connection = null;
            try {
                connection = await pool.connect();
                const beginSql = isolationLevel === 'read committed'
                    ? 'BEGIN'
                    : `BEGIN ISOLATION LEVEL ${isolationLevel.toUpperCase()}`;
                await connection.query(beginSql);
                await connection.query("SELECT set_config('app.user_id', $1::text, true)", [userId]);
                const result = await queryFn(connection);
                await connection.query('COMMIT');
                return result;
            }
            catch (error) {
                if (connection) {
                    try {
                        await connection.query('ROLLBACK');
                    }
                    catch (rollbackError) {
                        console.error(`[TenantContextService] Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : 'unknown error'}`);
                    }
                }
                const isRetryableConcurrencyFailure = typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    (error.code === '40001' || error.code === '40P01');
                if (!isRetryableConcurrencyFailure || attempt >= serializationRetries) {
                    throw error;
                }
                attempt += 1;
            }
            finally {
                if (connection) {
                    try {
                        connection.release();
                    }
                    catch (releaseError) {
                        console.error(`[TenantContextService] Connection release failed: ${releaseError instanceof Error ? releaseError.message : 'unknown error'}`);
                    }
                }
            }
        }
    }
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
    async querySingleWithContext(userId, query, params) {
        return this.executeWithContext(userId, async (connection) => {
            const result = await connection.query(query, params);
            return result.rows[0] || null;
        });
    }
};
exports.TenantContextService = TenantContextService;
exports.TenantContextService = TenantContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TenantContextService);
//# sourceMappingURL=tenant-context.service.js.map