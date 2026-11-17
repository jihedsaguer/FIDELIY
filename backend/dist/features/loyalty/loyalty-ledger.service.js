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
exports.LoyaltyLedgerService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const business_access_service_1 = require("../merchants/business-access.service");
let LoyaltyLedgerService = class LoyaltyLedgerService {
    constructor(tenantContext, businessAccess) {
        this.tenantContext = tenantContext;
        this.businessAccess = businessAccess;
    }
    async createTransaction(authenticatedUserId, input) {
        this.validateInput(input);
        const fingerprint = this.fingerprint(input);
        return this.tenantContext.executeWithContext(authenticatedUserId, (connection) => this.createWithinTransaction(connection, authenticatedUserId, input, fingerprint), { isolationLevel: 'serializable', serializationRetries: 3 });
    }
    async createWithinTransaction(connection, userId, input, fingerprint) {
        const business = await this.getOwnedBusiness(connection, userId);
        const existing = await this.findByIdempotencyKey(connection, business.id, input.idempotencyKey);
        if (existing) {
            return this.returnIdempotentResult(connection, existing, fingerprint);
        }
        await this.validateMembership(connection, business.id, input.membershipId);
        await this.validateBranch(connection, business.id, input.branchId);
        await this.validateConfigurations(connection, business.id, input.entries, input.category !== 'reversal');
        await this.validateReversal(connection, business.id, input);
        const inserted = await connection.query(`INSERT INTO loyalty_transactions
         (business_id, membership_id, branch_id, merchant_account_id,
          category, occurred_at, idempotency_key, request_fingerprint,
          reverses_transaction_id)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7, $8, $9)
       ON CONFLICT (business_id, idempotency_key) DO NOTHING
       RETURNING id`, [
            business.id,
            input.membershipId,
            input.branchId ?? null,
            business.merchantAccountId,
            input.category,
            input.occurredAt ?? null,
            input.idempotencyKey,
            fingerprint,
            input.reversesTransactionId ?? null,
        ]);
        if (!inserted.rows[0]) {
            const concurrent = await this.findByIdempotencyKey(connection, business.id, input.idempotencyKey);
            if (!concurrent) {
                throw new common_1.ConflictException('Concurrent idempotent transaction could not be resolved');
            }
            return this.returnIdempotentResult(connection, concurrent, fingerprint);
        }
        const entries = [];
        for (const entry of input.entries) {
            const result = await connection.query(`INSERT INTO loyalty_activity_entries
           (transaction_id, activity_type, delta, program_configuration_id,
            reverses_entry_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, activity_type AS "activityType", delta,
                   program_configuration_id AS "programConfigurationId",
                   reverses_entry_id AS "reversesEntryId"`, [
                inserted.rows[0].id,
                entry.activityType,
                entry.delta,
                entry.programConfigurationId,
                entry.reversesEntryId ?? null,
            ]);
            entries.push(result.rows[0]);
        }
        return { id: inserted.rows[0].id, entries };
    }
    async getOwnedBusiness(connection, userId) {
        const business = await this.businessAccess.shareOwnedBusiness(connection, userId);
        if (!business) {
            throw new common_1.NotFoundException('Business not found for this merchant');
        }
        return business;
    }
    async findByIdempotencyKey(connection, businessId, idempotencyKey) {
        const result = await connection.query(`SELECT id, request_fingerprint AS "requestFingerprint"
       FROM loyalty_transactions
       WHERE business_id = $1 AND idempotency_key = $2`, [businessId, idempotencyKey]);
        return result.rows[0];
    }
    async returnIdempotentResult(connection, existing, fingerprint) {
        if (existing.requestFingerprint !== fingerprint) {
            throw new common_1.ConflictException('Idempotency key was already used with a different request');
        }
        const result = await connection.query(`SELECT id, activity_type AS "activityType", delta,
              program_configuration_id AS "programConfigurationId",
              reverses_entry_id AS "reversesEntryId"
       FROM loyalty_activity_entries
       WHERE transaction_id = $1
       ORDER BY created_at, id`, [existing.id]);
        return { id: existing.id, entries: result.rows };
    }
    async validateMembership(connection, businessId, membershipId) {
        const result = await connection.query(`SELECT id
       FROM customer_business_memberships
       WHERE id = $1 AND business_id = $2 AND status = 'active'
       FOR UPDATE`, [membershipId, businessId]);
        if (!result.rows[0]) {
            throw new common_1.NotFoundException('Active customer membership was not found for this business');
        }
    }
    async validateBranch(connection, businessId, branchId) {
        if (!branchId)
            return;
        const result = await connection.query('SELECT id FROM branches WHERE id = $1 AND business_id = $2 FOR SHARE', [branchId, businessId]);
        if (!result.rows[0]) {
            throw new common_1.NotFoundException('Branch not found for this business');
        }
    }
    async validateConfigurations(connection, businessId, entries, requireActiveProgram) {
        for (const entry of entries) {
            const result = await connection.query(`SELECT pc.id
         FROM program_configurations pc
         JOIN programs p ON p.id = pc.program_id
         WHERE pc.id = $1
           AND pc.type = $2
           AND p.business_id = $3
           AND ($4::boolean = false OR p.status = 'active')
         FOR SHARE OF pc, p`, [
                entry.programConfigurationId,
                entry.activityType,
                businessId,
                requireActiveProgram,
            ]);
            if (!result.rows[0]) {
                throw new common_1.BadRequestException('Activity configuration is not active for this business and activity type');
            }
        }
    }
    async validateReversal(connection, businessId, input) {
        if (input.category !== 'reversal')
            return;
        const transaction = await connection.query(`SELECT id, category
       FROM loyalty_transactions
       WHERE id = $1 AND business_id = $2 AND membership_id = $3
       FOR SHARE`, [
            input.reversesTransactionId,
            businessId,
            input.membershipId,
        ]);
        const origTx = transaction.rows[0];
        if (!origTx) {
            throw new common_1.NotFoundException('Transaction to reverse was not found for this membership');
        }
        if (origTx.category === 'reversal') {
            throw new common_1.BadRequestException('Cannot reverse a reversal transaction');
        }
        const existingReversal = await connection.query(`SELECT id
       FROM loyalty_transactions
       WHERE reverses_transaction_id = $1`, [input.reversesTransactionId]);
        if (existingReversal.rows[0]) {
            throw new common_1.ConflictException('Transaction has already been reversed');
        }
        const originalEntriesResult = await connection.query(`SELECT id,
              activity_type AS "activityType",
              delta,
              program_configuration_id AS "programConfigurationId"
       FROM loyalty_activity_entries
       WHERE transaction_id = $1
       ORDER BY id`, [input.reversesTransactionId]);
        const originalEntries = originalEntriesResult.rows;
        if (input.entries.length !== originalEntries.length) {
            throw new common_1.BadRequestException('Full reversal must reverse all entries of the original transaction');
        }
        const seenReversesEntryIds = new Set();
        for (const entry of input.entries) {
            if (!entry.reversesEntryId) {
                throw new common_1.BadRequestException('Each reversal activity entry must reference an original entry');
            }
            if (seenReversesEntryIds.has(entry.reversesEntryId)) {
                throw new common_1.BadRequestException('Duplicate reversal entry reference in reversal request');
            }
            seenReversesEntryIds.add(entry.reversesEntryId);
            const originalEntry = originalEntries.find((orig) => orig.id === entry.reversesEntryId);
            if (!originalEntry) {
                throw new common_1.BadRequestException('Reversal entry must reference an original entry belonging to the reversed transaction');
            }
            if (entry.activityType !== originalEntry.activityType) {
                throw new common_1.BadRequestException('Reversal entry activity type does not match original entry');
            }
            if (entry.programConfigurationId !== originalEntry.programConfigurationId) {
                throw new common_1.BadRequestException('Reversal entry program configuration does not match original entry');
            }
            if (entry.delta !== -originalEntry.delta) {
                throw new common_1.BadRequestException('Reversal entry delta must be the exact inverse of the original entry delta');
            }
        }
        const entryIds = Array.from(seenReversesEntryIds);
        const alreadyReversedEntries = await connection.query(`SELECT reverses_entry_id
       FROM loyalty_activity_entries
       WHERE reverses_entry_id = ANY($1::uuid[])`, [entryIds]);
        if (alreadyReversedEntries.rows[0]) {
            throw new common_1.ConflictException('One or more entries have already been reversed');
        }
    }
    validateInput(input) {
        if (typeof input.idempotencyKey !== 'string' ||
            input.idempotencyKey.length < 1 ||
            input.idempotencyKey.length > 128) {
            throw new common_1.BadRequestException('Idempotency key must contain between 1 and 128 characters');
        }
        if (!input.entries.length) {
            throw new common_1.BadRequestException('A loyalty transaction must contain at least one activity entry');
        }
        if ((input.category === 'reversal') !==
            Boolean(input.reversesTransactionId)) {
            throw new common_1.BadRequestException('Only reversal transactions may reference an original transaction');
        }
        if (input.occurredAt && Number.isNaN(input.occurredAt.getTime())) {
            throw new common_1.BadRequestException('Occurrence time must be a valid date');
        }
        for (const entry of input.entries) {
            if (!Number.isSafeInteger(entry.delta) ||
                entry.delta === 0 ||
                !['stamps', 'points'].includes(entry.activityType)) {
                throw new common_1.BadRequestException('Invalid loyalty activity entry');
            }
            if (input.category !== 'reversal' && entry.reversesEntryId) {
                throw new common_1.BadRequestException('Only reversal transactions may reference a reversal entry');
            }
        }
    }
    fingerprint(input) {
        const canonical = JSON.stringify({
            membershipId: input.membershipId,
            branchId: input.branchId ?? null,
            category: input.category,
            occurredAt: input.occurredAt?.toISOString() ?? null,
            reversesTransactionId: input.reversesTransactionId ?? null,
            entries: [...input.entries]
                .map((entry) => ({
                activityType: entry.activityType,
                delta: entry.delta,
                programConfigurationId: entry.programConfigurationId,
                reversesEntryId: entry.reversesEntryId ?? null,
            }))
                .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
        });
        return (0, node_crypto_1.createHash)('sha256').update(canonical, 'utf8').digest('hex');
    }
};
exports.LoyaltyLedgerService = LoyaltyLedgerService;
exports.LoyaltyLedgerService = LoyaltyLedgerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService,
        business_access_service_1.BusinessAccessService])
], LoyaltyLedgerService);
//# sourceMappingURL=loyalty-ledger.service.js.map