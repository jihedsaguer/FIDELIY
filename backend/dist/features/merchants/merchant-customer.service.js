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
exports.MerchantCustomerService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const customer_qr_1 = require("../../shared/security/customer-qr");
const business_access_service_1 = require("./business-access.service");
let MerchantCustomerService = class MerchantCustomerService {
    constructor(tenantContext, businessAccess) {
        this.tenantContext = tenantContext;
        this.businessAccess = businessAccess;
    }
    resolveCustomerQr(userId, credential) {
        const credentialHash = (0, customer_qr_1.hashCustomerQrCredential)(credential);
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const business = await this.getOwnedBusiness(connection, userId);
            const result = await connection.query(`SELECT u.name AS "customerName",
                m.status AS "membershipStatus",
                m.joined_at AS "joinedAt"
         FROM customer_qr_credentials qr
         JOIN customer_accounts ca ON ca.id = qr.customer_account_id
         JOIN users u ON u.id = ca.user_id
         LEFT JOIN customer_business_memberships m
           ON m.customer_account_id = ca.id
          AND m.business_id = $2
         WHERE qr.credential_hash = $1
           AND qr.revoked_at IS NULL
         LIMIT 1`, [credentialHash, business.id]);
            const customer = result.rows[0];
            if (!customer) {
                throw new common_1.NotFoundException('Customer QR credential is invalid or revoked');
            }
            if (customer.membershipStatus !== 'active' || !customer.joinedAt) {
                throw new common_1.ConflictException('Customer must join this business before loyalty operations can continue');
            }
            return {
                customer: { name: customer.customerName },
                membership: {
                    status: customer.membershipStatus,
                    joinedAt: customer.joinedAt,
                },
            };
        });
    }
    async getOwnedBusiness(connection, userId) {
        const business = await this.businessAccess.findOwnedBusiness(connection, userId);
        if (!business) {
            throw new common_1.NotFoundException('Business not found for this merchant');
        }
        return business;
    }
};
exports.MerchantCustomerService = MerchantCustomerService;
exports.MerchantCustomerService = MerchantCustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService,
        business_access_service_1.BusinessAccessService])
], MerchantCustomerService);
//# sourceMappingURL=merchant-customer.service.js.map