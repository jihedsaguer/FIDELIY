"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessAccessService = void 0;
const common_1 = require("@nestjs/common");
const FIND_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       LIMIT 1`;
const LOCK_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR UPDATE OF b`;
const SHARE_OWNED_BUSINESS_SQL = `SELECT b.id, b.merchant_id AS "merchantAccountId"
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR SHARE OF b, ma`;
/**
 * Merchant-owned business lookups. Runs on the caller's transaction
 * and does not open a TenantContext of its own.
 */
let BusinessAccessService = class BusinessAccessService {
    async findOwnedBusiness(connection, userId) {
        const result = await connection.query(FIND_OWNED_BUSINESS_SQL, [userId]);
        return result.rows[0] ?? null;
    }
    async lockOwnedBusinessForUpdate(connection, userId) {
        const result = await connection.query(LOCK_OWNED_BUSINESS_SQL, [userId]);
        return result.rows[0] ?? null;
    }
    async shareOwnedBusiness(connection, userId) {
        const result = await connection.query(SHARE_OWNED_BUSINESS_SQL, [userId]);
        return result.rows[0] ?? null;
    }
};
exports.BusinessAccessService = BusinessAccessService;
exports.BusinessAccessService = BusinessAccessService = __decorate([
    (0, common_1.Injectable)()
], BusinessAccessService);
//# sourceMappingURL=business-access.service.js.map