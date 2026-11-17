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
exports.CustomerMembershipService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const customer_qr_1 = require("../../shared/security/customer-qr");
let CustomerMembershipService = class CustomerMembershipService {
    constructor(tenantContext) {
        this.tenantContext = tenantContext;
    }
    discoverBusiness(userId, businessQrId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const result = await connection.query(`SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.type AS "programType",
                p.version AS "programVersion",
                m.id AS "membershipId",
                m.status AS "membershipStatus"
         FROM businesses b
         LEFT JOIN programs p
           ON p.business_id = b.id AND p.status = 'active'
         LEFT JOIN customer_business_memberships m
           ON m.business_id = b.id AND m.customer_account_id = $2
         WHERE b.public_qr_id = $1`, [businessQrId, customer.id]);
            return this.toDiscoveryResponse(result.rows[0]);
        });
    }
    discoverBranch(userId, branchQrId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const result = await connection.query(`SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.type AS "programType",
                p.version AS "programVersion",
                m.id AS "membershipId",
                m.status AS "membershipStatus",
                br.name AS "branchName",
                br.address AS "branchAddress"
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         LEFT JOIN programs p
           ON p.business_id = b.id AND p.status = 'active'
         LEFT JOIN customer_business_memberships m
           ON m.business_id = b.id AND m.customer_account_id = $2
         WHERE br.qr_code_id = $1`, [branchQrId, customer.id]);
            return this.toDiscoveryResponse(result.rows[0]);
        });
    }
    async joinBusiness(userId, input) {
        if (!input.businessQrId && !input.branchQrId) {
            throw new common_1.BadRequestException('A business QR identifier or branch QR identifier is required');
        }
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const business = await this.resolveJoinBusiness(connection, input);
            const activeProgram = await connection.query(`SELECT id
         FROM programs
         WHERE business_id = $1 AND status = 'active'
         LIMIT 1`, [business.id]);
            if (!activeProgram.rows[0]) {
                throw new common_1.ConflictException('This business does not have an active loyalty programme');
            }
            const inserted = await connection.query(`INSERT INTO customer_business_memberships
           (customer_account_id, business_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (customer_account_id, business_id) DO NOTHING
         RETURNING id`, [customer.id, business.id]);
            let membershipId = inserted.rows[0]?.id;
            if (membershipId) {
                await this.recordMembershipEvent(connection, membershipId, 'joined');
            }
            else {
                const existing = await connection.query(`SELECT id, status
           FROM customer_business_memberships
           WHERE customer_account_id = $1 AND business_id = $2
           FOR UPDATE`, [customer.id, business.id]);
                const membership = existing.rows[0];
                if (!membership) {
                    throw new common_1.ConflictException('Membership could not be created');
                }
                membershipId = membership.id;
                if (membership.status === 'inactive') {
                    await connection.query(`UPDATE customer_business_memberships
             SET status = 'active', left_at = NULL, updated_at = now()
             WHERE id = $1`, [membership.id]);
                    await this.recordMembershipEvent(connection, membership.id, 'joined');
                }
            }
            return this.loadMembership(connection, customer.id, membershipId);
        });
    }
    listMemberships(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const result = await connection.query(this.membershipSelect() +
                ` WHERE m.customer_account_id = $1
            ORDER BY m.joined_at DESC, m.id`, [customer.id]);
            return result.rows.map((row) => this.toMembershipResponse(row));
        });
    }
    getMembership(userId, membershipId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            return this.loadMembership(connection, customer.id, membershipId);
        });
    }
    async leaveMembership(userId, membershipId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const membership = await connection.query(`SELECT id, status
         FROM customer_business_memberships
         WHERE id = $1 AND customer_account_id = $2
         FOR UPDATE`, [membershipId, customer.id]);
            const row = membership.rows[0];
            if (!row) {
                throw new common_1.NotFoundException('Membership not found');
            }
            if (row.status === 'active') {
                await connection.query(`UPDATE customer_business_memberships
           SET status = 'inactive', left_at = now(), updated_at = now()
           WHERE id = $1`, [row.id]);
                await this.recordMembershipEvent(connection, row.id, 'left');
            }
            return this.loadMembership(connection, customer.id, row.id);
        });
    }
    getPersonalQrCredential(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.getCustomerAccount(connection, userId);
            const result = await connection.query(`SELECT issued_at AS "issuedAt", true AS active
         FROM customer_qr_credentials
         WHERE customer_account_id = $1 AND revoked_at IS NULL`, [customer.id]);
            if (!result.rows[0]) {
                throw new common_1.NotFoundException('Personal QR credential has not been issued');
            }
            return result.rows[0];
        });
    }
    issuePersonalQrCredential(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.lockCustomerAccount(connection, userId);
            const existing = await this.readPersonalQrCredential(connection, customer.id);
            if (existing) {
                throw new common_1.ConflictException('A personal QR credential already exists. Rotate it to issue a new credential.');
            }
            const credential = (0, node_crypto_1.randomBytes)(32).toString('base64url');
            const inserted = await connection.query(`INSERT INTO customer_qr_credentials (customer_account_id, credential_hash)
         VALUES ($1, $2)
         ON CONFLICT (customer_account_id) WHERE revoked_at IS NULL DO NOTHING
         RETURNING issued_at AS "issuedAt"`, [customer.id, (0, customer_qr_1.hashCustomerQrCredential)(credential)]);
            if (!inserted.rows[0]) {
                throw new common_1.ConflictException('A personal QR credential was issued concurrently. Rotate it to issue a new credential.');
            }
            return { credential, issuedAt: inserted.rows[0].issuedAt };
        });
    }
    rotatePersonalQrCredential(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const customer = await this.lockCustomerAccount(connection, userId);
            await connection.query(`UPDATE customer_qr_credentials
         SET revoked_at = now()
         WHERE customer_account_id = $1 AND revoked_at IS NULL`, [customer.id]);
            const credential = (0, node_crypto_1.randomBytes)(32).toString('base64url');
            const result = await connection.query(`INSERT INTO customer_qr_credentials (customer_account_id, credential_hash)
         VALUES ($1, $2)
         RETURNING issued_at AS "issuedAt"`, [customer.id, (0, customer_qr_1.hashCustomerQrCredential)(credential)]);
            return { credential, issuedAt: result.rows[0].issuedAt };
        });
    }
    async getCustomerAccount(connection, userId) {
        const result = await connection.query(`SELECT id
       FROM customer_accounts
       WHERE user_id = $1
       LIMIT 1`, [userId]);
        const customer = result.rows[0];
        if (!customer) {
            throw new common_1.NotFoundException('Customer account not found');
        }
        return customer;
    }
    async lockCustomerAccount(connection, userId) {
        const result = await connection.query(`SELECT id
       FROM customer_accounts
       WHERE user_id = $1
       FOR UPDATE`, [userId]);
        const customer = result.rows[0];
        if (!customer) {
            throw new common_1.NotFoundException('Customer account not found');
        }
        return customer;
    }
    async resolveJoinBusiness(connection, input) {
        let result;
        if (input.businessQrId) {
            result = await connection.query(`SELECT b.id
         FROM businesses b
         WHERE b.public_qr_id = $1
           AND (
             $2::varchar IS NULL
             OR EXISTS (
               SELECT 1 FROM branches br
               WHERE br.business_id = b.id AND br.qr_code_id = $2
             )
           )
         LIMIT 1`, [input.businessQrId, input.branchQrId ?? null]);
        }
        else {
            result = await connection.query(`SELECT b.id
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         WHERE br.qr_code_id = $1
         LIMIT 1`, [input.branchQrId]);
        }
        const business = result.rows[0];
        if (!business) {
            throw new common_1.NotFoundException('Business or branch QR identifier was not found');
        }
        return business;
    }
    toDiscoveryResponse(row) {
        if (!row) {
            throw new common_1.NotFoundException('Business QR identifier was not found');
        }
        const response = {
            business: {
                name: row.name,
                description: row.description,
                logoUrl: row.logoUrl,
                theme: {
                    primaryColor: row.themePrimaryColor,
                    accentColor: row.themeAccentColor,
                },
                branchCount: row.branchCount,
            },
            program: row.programType && row.programVersion !== null
                ? { type: row.programType, version: row.programVersion }
                : null,
            membership: row.membershipStatus
                ? { status: row.membershipStatus }
                : null,
        };
        if (row.branchName !== undefined) {
            response.branch = {
                name: row.branchName ?? '',
                address: row.branchAddress ?? null,
            };
        }
        return response;
    }
    membershipSelect() {
        return `SELECT m.id,
                   m.status,
                   m.joined_at AS "joinedAt",
                   m.left_at AS "leftAt",
                   b.name AS "businessName",
                   b.logo_url AS "logoUrl",
                   p.type AS "programType",
                   p.version AS "programVersion"
            FROM customer_business_memberships m
            JOIN businesses b ON b.id = m.business_id
            LEFT JOIN programs p
              ON p.business_id = b.id AND p.status = 'active'`;
    }
    async loadMembership(connection, customerAccountId, membershipId) {
        const result = await connection.query(this.membershipSelect() +
            ` WHERE m.id = $1 AND m.customer_account_id = $2`, [membershipId, customerAccountId]);
        const membership = result.rows[0];
        if (!membership) {
            throw new common_1.NotFoundException('Membership not found');
        }
        const events = await connection.query(`SELECT type, occurred_at AS "occurredAt"
       FROM membership_lifecycle_events
       WHERE membership_id = $1
       ORDER BY occurred_at, id`, [membership.id]);
        return {
            ...this.toMembershipResponse(membership),
            lifecycle: events.rows,
        };
    }
    toMembershipResponse(row) {
        return {
            id: row.id,
            status: row.status,
            joinedAt: row.joinedAt,
            leftAt: row.leftAt,
            business: { name: row.businessName, logoUrl: row.logoUrl },
            program: row.programType
                ? { type: row.programType, version: row.programVersion }
                : null,
        };
    }
    async recordMembershipEvent(connection, membershipId, type) {
        await connection.query(`INSERT INTO membership_lifecycle_events (membership_id, type)
       VALUES ($1, $2)`, [membershipId, type]);
    }
    async readPersonalQrCredential(connection, customerAccountId) {
        const result = await connection.query(`SELECT credential_hash AS credential, issued_at AS "issuedAt"
       FROM customer_qr_credentials
       WHERE customer_account_id = $1 AND revoked_at IS NULL`, [customerAccountId]);
        return result.rows[0];
    }
};
exports.CustomerMembershipService = CustomerMembershipService;
exports.CustomerMembershipService = CustomerMembershipService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService])
], CustomerMembershipService);
//# sourceMappingURL=customer-membership.service.js.map