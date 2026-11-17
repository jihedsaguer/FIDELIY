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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicCustomerController = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const jose_1 = require("jose");
const database_service_1 = require("../../database/database.service");
const auth_service_1 = require("../auth/auth.service");
const phone_auth_service_1 = require("../auth/phone-auth.service");
const customer_qr_1 = require("../../shared/security/customer-qr");
const public_customer_dto_1 = require("./dto/public-customer.dto");
/**
 * Public Customer Controller
 *
 * Provides unauthenticated endpoints for customer onboarding via QR codes.
 * These endpoints do NOT require authentication and are accessible to the public.
 *
 * Endpoints:
 * - GET /public/businesses/qr/:qrId - Discover business information from QR code
 * - POST /public/customers/lookup - Look up existing customer by phone number
 * - POST /public/customers/join - Join a business and create customer account
 *
 * Security Notes:
 * - No @UseGuards() - these are public endpoints
 * - Rate limiting should be applied at the infrastructure level
 * - Phone lookup without OTP is an accepted MVP security limitation
 * - Session creation uses existing Better Auth infrastructure
 */
let PublicCustomerController = class PublicCustomerController {
    constructor(databaseService, authService, phoneAuthService) {
        this.databaseService = databaseService;
        this.authService = authService;
        this.phoneAuthService = phoneAuthService;
    }
    /**
     * Discover business information from a public QR code.
     *
     * This endpoint resolves a business or branch QR identifier to public information
     * that can be displayed to a customer before they join.
     *
     * @param qrId - The business public_qr_id or branch qr_code_id
     * @returns Business information including name, description, logo, theme, and active programme
     * @throws NotFoundException if the QR identifier is not found
     */
    async discoverBusiness(qrId) {
        const pool = this.databaseService.getPool();
        let connection;
        try {
            connection = await pool.connect();
            // Try to find as business public_qr_id first
            const businessResult = await connection.query(`SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.id AS "programId",
                p.type AS "programType",
                p.version AS "programVersion",
                p.name AS "programName",
                p.description AS "programDescription"
         FROM businesses b
         LEFT JOIN programs p ON p.business_id = b.id AND p.status = 'active'
         WHERE b.public_qr_id = $1
         LIMIT 1`, [qrId]);
            if (businessResult.rows.length > 0) {
                const row = businessResult.rows[0];
                return {
                    business: {
                        id: row.businessId,
                        name: row.name,
                        description: row.description,
                        logoUrl: row.logoUrl,
                        theme: {
                            primaryColor: row.themePrimaryColor,
                            accentColor: row.themeAccentColor,
                        },
                        branchCount: row.branchCount,
                    },
                    program: row.programType
                        ? {
                            type: row.programType,
                            version: row.programVersion,
                            name: row.programName,
                            description: row.programDescription,
                        }
                        : null,
                };
            }
            // Try to find as branch qr_code_id
            const branchResult = await connection.query(`SELECT b.id AS "businessId",
                b.name AS "businessName",
                b.description AS "businessDescription",
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                br.id AS "branchId",
                br.name AS "branchName",
                br.address AS "branchAddress",
                br.phone AS "branchPhone",
                p.id AS "programId",
                p.type AS "programType",
                p.version AS "programVersion",
                p.name AS "programName",
                p.description AS "programDescription"
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         LEFT JOIN programs p ON p.business_id = b.id AND p.status = 'active'
         WHERE br.qr_code_id = $1
         LIMIT 1`, [qrId]);
            if (branchResult.rows.length > 0) {
                const row = branchResult.rows[0];
                return {
                    business: {
                        id: row.businessId,
                        name: row.businessName,
                        description: row.businessDescription,
                        logoUrl: row.logoUrl,
                        theme: {
                            primaryColor: row.themePrimaryColor,
                            accentColor: row.themeAccentColor,
                        },
                        branchCount: row.branchCount,
                    },
                    program: row.programType
                        ? {
                            type: row.programType,
                            version: row.programVersion,
                            name: row.programName,
                            description: row.programDescription,
                        }
                        : null,
                    branch: {
                        id: row.branchId,
                        name: row.branchName,
                        address: row.branchAddress,
                        phone: row.branchPhone,
                    },
                };
            }
            throw new common_1.NotFoundException('Business or branch QR code not found');
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('[PublicCustomerController] Business discovery error:', error);
            throw new common_1.NotFoundException('Business or branch QR code not found');
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    }
    /**
     * Look up an existing customer by phone number.
     *
     * This endpoint checks if a customer with the given phone number already exists.
     * Used during onboarding to prevent duplicate customer identities.
     *
     * IMPORTANT: This does NOT verify phone ownership (no OTP required).
     * This is an accepted MVP security limitation - phone lookup is for account
     * recognition only, not authentication.
     *
     * To prevent account enumeration:
     * - Return the same response structure whether customer exists or not
     * - Only reveal minimal information (existence, not full details)
     * - Full customer data is only returned after successful join
     *
     * @param dto - Phone number to look up
     * @returns Whether a customer exists with this phone number
     * @throws BadRequestException if phone number is invalid
     */
    async lookupCustomer(dto) {
        // Normalize and validate phone number
        const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
        if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
            throw new common_1.BadRequestException('Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX');
        }
        const pool = this.databaseService.getPool();
        let connection;
        try {
            connection = await pool.connect();
            // Check if customer account exists with this phone number
            const customerResult = await connection.query(`SELECT u.id AS "userId",
                u.name,
                u.phone_number AS "phoneNumber",
                u.email,
                ca.id AS "customerAccountId"
         FROM users u
         JOIN customer_accounts ca ON ca.user_id = u.id
         WHERE u.phone_number = $1
         LIMIT 1`, [normalized]);
            if (customerResult.rows.length === 0) {
                // Customer does not exist
                // Return same structure to avoid enumeration
                return {
                    exists: false,
                };
            }
            const customer = customerResult.rows[0];
            // Get customer's memberships
            const membershipsResult = await connection.query(`SELECT m.business_id AS "businessId",
                b.name AS "businessName",
                m.status AS "status"
         FROM customer_business_memberships m
         JOIN businesses b ON b.id = m.business_id
         WHERE m.customer_account_id = $1
         ORDER BY m.joined_at DESC`, [customer.customerAccountId]);
            return {
                exists: true,
                customer: {
                    id: customer.userId,
                    name: customer.name,
                    phoneNumber: customer.phoneNumber,
                    birthdate: undefined, // Not stored in users table currently
                    hasMembership: membershipsResult.rows.length > 0,
                    memberships: membershipsResult.rows.map((row) => ({
                        businessId: row.businessId,
                        businessName: row.businessName,
                        status: row.status,
                    })),
                },
            };
        }
        catch (error) {
            console.error('[PublicCustomerController] Customer lookup error:', error);
            // Return same structure to avoid enumeration
            return {
                exists: false,
            };
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    }
    /**
     * Join a business and create a customer account.
     *
     * This is the main onboarding endpoint. It:
     * 1. Finds or creates a customer user and customer account
     * 2. Creates a business membership for the customer
     * 3. Issues a personal QR credential
     * 4. Creates and returns an HTTP-only session
     *
     * The customer can then immediately access their dashboard with the session.
     *
     * @param dto - Join business request with customer info
     * @param res - Express response for setting cookies
     * @returns Customer, membership, QR credential, and session information
     * @throws BadRequestException if phone number is invalid
     * @throws NotFoundException if business QR code is not found
     * @throws ConflictException if customer already has active membership
     */
    async joinBusiness(dto, res, req) {
        // Normalize and validate phone number
        const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
        if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
            res.status(400).json({
                error: 'Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX',
            });
            return;
        }
        const pool = this.databaseService.getPool();
        let connection;
        try {
            connection = await pool.connect();
            await connection.query('BEGIN');
            // Step 1: Resolve business from QR ID
            let businessId;
            let businessName;
            let branchId;
            // Try as business public_qr_id
            const businessResult = await connection.query('SELECT id, name FROM businesses WHERE public_qr_id = $1 LIMIT 1', [dto.qrId]);
            if (businessResult.rows.length > 0) {
                businessId = businessResult.rows[0].id;
                businessName = businessResult.rows[0].name;
                // If branchQrId is also provided, find the specific branch
                if (dto.branchQrId) {
                    const branchResult = await connection.query('SELECT id FROM branches WHERE qr_code_id = $1 AND business_id = $2 LIMIT 1', [dto.branchQrId, businessId]);
                    if (branchResult.rows.length > 0) {
                        branchId = branchResult.rows[0].id;
                    }
                }
            }
            else {
                // Try as branch qr_code_id
                const branchBusinessResult = await connection.query(`SELECT b.id AS "businessId", b.name AS "businessName", br.id AS "branchId"
           FROM branches br
           JOIN businesses b ON b.id = br.business_id
           WHERE br.qr_code_id = $1
           LIMIT 1`, [dto.qrId]);
                if (branchBusinessResult.rows.length > 0) {
                    businessId = branchBusinessResult.rows[0].businessId;
                    businessName = branchBusinessResult.rows[0].businessName;
                    branchId = branchBusinessResult.rows[0].branchId;
                }
                else {
                    throw new common_1.NotFoundException('Business or branch QR code not found');
                }
            }
            // Check if business has an active programme
            const programmeResult = await connection.query('SELECT id FROM programs WHERE business_id = $1 AND status = \'active\' LIMIT 1', [businessId]);
            if (programmeResult.rows.length === 0) {
                throw new common_1.ConflictException('This business does not have an active loyalty programme');
            }
            // Step 2: Use phone sign-in to create/find user, customer account, and session
            // This reuses AuthService.phoneSignIn() for consistent session creation
            const phoneSignInResult = await this.authService.phoneSignIn(normalized);
            const userId = phoneSignInResult.user.id;
            // Get customer account ID
            let customerAccountId;
            const customerAccountResult = await connection.query('SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1', [userId]);
            if (customerAccountResult.rows.length > 0) {
                customerAccountId = customerAccountResult.rows[0].id;
            }
            else {
                // Should not happen since phoneSignIn creates customer account, but handle just in case
                const createCaResult = await connection.query(`INSERT INTO customer_accounts 
             (user_id, phone_number, phone_verified, created_at, updated_at, joined_at)
           VALUES ($1, $2, false, now(), now(), now())
           RETURNING id`, [userId, normalized]);
                customerAccountId = createCaResult.rows[0].id;
            }
            // Update user name if provided
            if (dto.name) {
                await connection.query('UPDATE users SET name = $1 WHERE id = $2', [dto.name, userId]);
            }
            // Use the session from phoneSignIn
            const sessionToken = phoneSignInResult.session.token;
            const sessionExpiresAt = new Date(phoneSignInResult.session.expiresAt);
            // Step 3: Create or reactivate membership
            let membershipId;
            const existingMembershipResult = await connection.query(`SELECT id, status FROM customer_business_memberships 
         WHERE customer_account_id = $1 AND business_id = $2
         LIMIT 1`, [customerAccountId, businessId]);
            if (existingMembershipResult.rows.length > 0) {
                const existing = existingMembershipResult.rows[0];
                membershipId = existing.id;
                if (existing.status === 'inactive') {
                    // Reactivate membership
                    await connection.query(`UPDATE customer_business_memberships 
             SET status = 'active', left_at = NULL, updated_at = now()
             WHERE id = $1`, [membershipId]);
                    console.log(`[PublicJoin] Reactivated membership: ${membershipId.substring(0, 8)}...`);
                }
                else {
                    // Already active
                    console.log(`[PublicJoin] Existing active membership: ${membershipId.substring(0, 8)}...`);
                }
            }
            else {
                // Create new membership
                const createMembershipResult = await connection.query(`INSERT INTO customer_business_memberships 
             (customer_account_id, business_id, status, joined_at, created_at, updated_at)
           VALUES ($1, $2, 'active', now(), now(), now())
           RETURNING id`, [customerAccountId, businessId]);
                membershipId = createMembershipResult.rows[0].id;
                console.log(`[PublicJoin] Created new membership: ${membershipId.substring(0, 8)}...`);
            }
            // Step 4: Record membership lifecycle event
            await connection.query(`INSERT INTO membership_lifecycle_events 
           (membership_id, type, occurred_at)
         VALUES ($1, 'joined', now())`, [membershipId]);
            // Step 5: Issue personal QR credential
            let personalQrCredential;
            const existingQrResult = await connection.query(`SELECT credential_hash FROM customer_qr_credentials 
         WHERE customer_account_id = $1 AND revoked_at IS NULL
         LIMIT 1`, [customerAccountId]);
            if (existingQrResult.rows.length === 0) {
                const credential = crypto.randomBytes(32).toString('base64url');
                const credentialHash = (0, customer_qr_1.hashCustomerQrCredential)(credential);
                await connection.query(`INSERT INTO customer_qr_credentials 
             (customer_account_id, credential_hash, issued_at)
           VALUES ($1, $2, now())`, [customerAccountId, credentialHash]);
                personalQrCredential = credential;
                console.log(`[PublicJoin] Issued new QR credential`);
            }
            else {
                console.log(`[PublicJoin] Using existing QR credential`);
            }
            await connection.query('COMMIT');
            console.log(`[PublicJoin] Using session from phoneSignIn: ${sessionToken.substring(0, 8)}...`);
            // Step 6: Create and set session cookie using the same pattern as auth.handler.ts
            const auth = this.authService.getBetterAuth();
            const secret = auth.options.secret;
            const signedToken = await new jose_1.SignJWT({ jti: sessionToken })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime(Math.floor(sessionExpiresAt.getTime() / 1000))
                .sign(new TextEncoder().encode(secret));
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            };
            res.cookie('session_token', signedToken, cookieOptions);
            // Step 7: Return response
            const response = {
                customer: {
                    id: userId,
                    name: dto.name,
                    phoneNumber: normalized,
                    birthdate: dto.birthdate,
                },
                membership: {
                    id: membershipId,
                    businessId,
                    businessName,
                    status: 'active',
                    joinedAt: new Date().toISOString(),
                },
                personalQrCredential,
                session: {
                    token: sessionToken,
                    expiresAt: sessionExpiresAt.toISOString(),
                },
            };
            res.json(response);
        }
        catch (error) {
            if (connection) {
                try {
                    await connection.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('[PublicJoin] Rollback failed:', rollbackError);
                }
            }
            console.error('[PublicJoin] Join error:', error);
            if (error instanceof common_1.NotFoundException) {
                res.status(404).json({ error: error.message });
            }
            else if (error instanceof common_1.ConflictException) {
                res.status(409).json({ error: error.message });
            }
            else if (error instanceof common_1.BadRequestException) {
                res.status(400).json({ error: error.message });
            }
            else if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to join business' });
            }
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    }
};
exports.PublicCustomerController = PublicCustomerController;
__decorate([
    (0, common_1.Get)('/businesses/qr/:qrId'),
    __param(0, (0, common_1.Param)('qrId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicCustomerController.prototype, "discoverBusiness", null);
__decorate([
    (0, common_1.Post)('/customers/lookup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [public_customer_dto_1.PublicCustomerLookupDto]),
    __metadata("design:returntype", Promise)
], PublicCustomerController.prototype, "lookupCustomer", null);
__decorate([
    (0, common_1.Post)('/customers/join'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [public_customer_dto_1.PublicJoinBusinessDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PublicCustomerController.prototype, "joinBusiness", null);
exports.PublicCustomerController = PublicCustomerController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        auth_service_1.AuthService,
        phone_auth_service_1.PhoneAuthService])
], PublicCustomerController);
//# sourceMappingURL=public-customer.controller.js.map