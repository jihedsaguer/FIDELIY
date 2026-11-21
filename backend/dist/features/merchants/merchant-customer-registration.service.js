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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantCustomerRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const customer_qr_1 = require("../../shared/security/customer-qr");
const phone_auth_service_1 = require("../auth/phone-auth.service");
const business_access_service_1 = require("./business-access.service");
/**
 * Service for merchant-assisted customer registration.
 *
 * Responsibilities:
 * - Validate merchant ownership of business
 * - Validate customer phone uniqueness
 * - Create user account (if not exists)
 * - Create customer account (if not exists)
 * - Create business membership
 * - Issue personal QR credential (hash only stored)
 * - Return registration result WITHOUT creating a customer session
 */
let MerchantCustomerRegistrationService = class MerchantCustomerRegistrationService {
    constructor(tenantContext, phoneAuthService, businessAccess) {
        this.tenantContext = tenantContext;
        this.phoneAuthService = phoneAuthService;
        this.businessAccess = businessAccess;
    }
    /**
     * Register a customer on behalf of a merchant.
     *
     * This method:
     * 1. Validates the merchant owns a business
     * 2. Validates the phone number format
     * 3. Checks for existing customer with this phone
     * 4. Creates user if doesn't exist
     * 5. Creates customer account if doesn't exist
     * 6. Creates business membership
     * 7. Issues personal QR credential (returns raw value once, stores hash only)
     * 8. Returns result WITHOUT creating a session
     *
     * @param merchantUserId - Authenticated merchant user ID
     * @param dto - Customer registration data
     * @returns Registration result with customer, membership, and QR credential
     * @throws BadRequestException - Invalid phone number
     * @throws ConflictException - Customer already exists with this phone
     * @throws NotFoundException - Merchant has no business
     */
    async registerCustomer(merchantUserId, dto) {
        // Normalize and validate phone number
        const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
        if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
            throw new common_1.BadRequestException('Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX');
        }
        return this.tenantContext.executeWithContext(merchantUserId, async (connection) => {
            // Get merchant's owned business
            const business = await this.businessAccess.lockOwnedBusinessForUpdate(connection, merchantUserId);
            if (!business) {
                throw new common_1.NotFoundException('Merchant business not found');
            }
            // Check if customer with this phone already exists
            const existingCustomer = await this.findCustomerByPhone(connection, normalized);
            let customerUserId;
            let customerAccountId;
            if (existingCustomer) {
                customerUserId = existingCustomer.userId;
                customerAccountId = existingCustomer.customerAccountId;
            }
            else {
                // Create new user
                customerUserId = await this.createUser(connection, dto.name, normalized, dto.birthdate);
                // Create customer account
                customerAccountId = await this.createCustomerAccount(connection, customerUserId, normalized);
            }
            // Check if customer already has membership in this business
            const existingMembership = await this.findActiveMembership(connection, customerAccountId, business.id);
            let membershipId;
            if (existingMembership) {
                // Reactivate if inactive
                if (existingMembership.status === 'inactive') {
                    await connection.query(`UPDATE customer_business_memberships 
               SET status = 'active', left_at = NULL, updated_at = now()
               WHERE id = $1`, [existingMembership.id]);
                    await this.recordMembershipEvent(connection, existingMembership.id, 'joined');
                    membershipId = existingMembership.id;
                }
                else {
                    // Already active - this shouldn't happen but handle gracefully
                    membershipId = existingMembership.id;
                }
            }
            else {
                // Create new membership
                membershipId = await this.createMembership(connection, customerAccountId, business.id);
            }
            // Issue personal QR credential - returns raw value once, stores hash only
            const personalQrCredential = await this.issuePersonalQrCredential(connection, customerAccountId, existingCustomer !== undefined);
            // Get business name for response
            const businessName = await this.getBusinessName(connection, business.id);
            return {
                customer: {
                    id: customerUserId,
                    name: dto.name,
                    phoneNumber: normalized,
                    birthdate: dto.birthdate,
                },
                membership: {
                    id: membershipId,
                    businessId: business.id,
                    businessName,
                    status: 'active',
                    joinedAt: new Date().toISOString(),
                },
                personalQrCredential,
            };
        });
    }
    /**
     * Find customer by phone number.
     */
    async findCustomerByPhone(connection, phoneNumber) {
        const result = await connection.query(`SELECT u.id AS "userId", ca.id AS "customerAccountId"
       FROM users u
       JOIN customer_accounts ca ON ca.user_id = u.id
       WHERE u.phone_number = $1
       LIMIT 1`, [phoneNumber]);
        return result.rows[0] ?? null;
    }
    /**
     * Create a new user account.
     */
    async createUser(connection, name, phoneNumber, birthdate) {
        const result = await connection.query(`INSERT INTO users (name, phone_number, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (phone_number) DO UPDATE
         SET name = COALESCE(users.name, EXCLUDED.name),
             updated_at = now()
       RETURNING id`, [name, phoneNumber]);
        // If there was a conflict (phone already exists but no customer account),
        // we need to create the customer account separately
        const user = result.rows[0];
        if (!user?.id) {
            throw new common_1.ConflictException('A user with this phone number already exists');
        }
        return user.id;
    }
    /**
     * Create a customer account for a user.
     */
    async createCustomerAccount(connection, userId, phoneNumber) {
        const result = await connection.query(`INSERT INTO customer_accounts (user_id, phone_number, phone_verified, joined_at, created_at, updated_at)
       VALUES ($1, $2, false, now(), now(), now())
       ON CONFLICT (user_id) DO NOTHING
       RETURNING id`, [userId, phoneNumber]);
        const customerAccount = result.rows[0];
        if (customerAccount?.id) {
            return customerAccount.id;
        }
        // If ON CONFLICT did nothing (customer account already exists), fetch it
        const existing = await connection.query(`SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1`, [userId]);
        if (existing.rows[0]?.id) {
            return existing.rows[0].id;
        }
        throw new Error('Failed to create or retrieve customer account');
    }
    /**
     * Find active membership for customer in business.
     */
    async findActiveMembership(connection, customerAccountId, businessId) {
        const result = await connection.query(`SELECT id, status 
       FROM customer_business_memberships 
       WHERE customer_account_id = $1 AND business_id = $2
       LIMIT 1`, [customerAccountId, businessId]);
        return result.rows[0] ?? null;
    }
    /**
     * Create a new business membership for a customer.
     */
    async createMembership(connection, customerAccountId, businessId) {
        const result = await connection.query(`INSERT INTO customer_business_memberships 
         (customer_account_id, business_id, status, joined_at, created_at, updated_at)
       VALUES ($1, $2, 'active', now(), now(), now())
       ON CONFLICT (customer_account_id, business_id) DO NOTHING
       RETURNING id`, [customerAccountId, businessId]);
        const membership = result.rows[0];
        if (membership?.id) {
            await this.recordMembershipEvent(connection, membership.id, 'joined');
            return membership.id;
        }
        // If ON CONFLICT did nothing, fetch the existing membership
        const existing = await connection.query(`SELECT id FROM customer_business_memberships 
       WHERE customer_account_id = $1 AND business_id = $2
       LIMIT 1`, [customerAccountId, businessId]);
        if (existing.rows[0]?.id) {
            return existing.rows[0].id;
        }
        throw new Error('Failed to create or retrieve membership');
    }
    /**
     * Issue a personal QR credential for a customer account.
     *
     * Security: Only the SHA-256 hash is stored in the database.
     * The raw credential is returned ONCE (for new customers only).
     * For existing customers, returns undefined since we cannot retrieve the raw value
     * from the hash.
     *
     * @param connection - Database connection
     * @param customerAccountId - Customer account ID
     * @param isExistingCustomer - True if customer already existed before this registration
     * @returns Raw credential for NEW customers only, undefined for existing customers
     */
    async issuePersonalQrCredential(connection, customerAccountId, isExistingCustomer) {
        // Check for existing active QR credential
        const existingResult = await connection.query(`SELECT credential_hash 
       FROM customer_qr_credentials 
       WHERE customer_account_id = $1 AND revoked_at IS NULL
       LIMIT 1`, [customerAccountId]);
        if (existingResult.rows[0]?.credentialHash) {
            // Customer already has a QR credential (hash only stored)
            // We cannot retrieve the raw credential from the hash
            // Return undefined - the merchant should not regenerate it
            return undefined;
        }
        // Customer has no QR credential - generate a new one
        // Return the raw value ONCE for the merchant to display to the new customer
        // Only store the hash in the database
        const credential = crypto.randomBytes(32).toString('base64url');
        const credentialHash = (0, customer_qr_1.hashCustomerQrCredential)(credential);
        await connection.query(`INSERT INTO customer_qr_credentials 
         (customer_account_id, credential_hash, issued_at)
       VALUES ($1, $2, now())`, [customerAccountId, credentialHash]);
        return credential;
    }
    /**
     * Get business name by ID.
     */
    async getBusinessName(connection, businessId) {
        const result = await connection.query(`SELECT name FROM businesses WHERE id = $1 LIMIT 1`, [businessId]);
        const business = result.rows[0];
        if (!business?.name) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business.name;
    }
    /**
     * Record a membership lifecycle event.
     */
    async recordMembershipEvent(connection, membershipId, type) {
        await connection.query(`INSERT INTO membership_lifecycle_events (membership_id, type, occurred_at)
       VALUES ($1, $2, now())`, [membershipId, type]);
    }
};
exports.MerchantCustomerRegistrationService = MerchantCustomerRegistrationService;
exports.MerchantCustomerRegistrationService = MerchantCustomerRegistrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService,
        phone_auth_service_1.PhoneAuthService,
        business_access_service_1.BusinessAccessService])
], MerchantCustomerRegistrationService);
//# sourceMappingURL=merchant-customer-registration.service.js.map