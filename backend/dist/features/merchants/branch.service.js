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
exports.BranchService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const business_access_service_1 = require("./business-access.service");
const branch_dto_1 = require("./dto/branch.dto");
let BranchService = class BranchService {
    constructor(tenantContext, businessAccess) {
        this.tenantContext = tenantContext;
        this.businessAccess = businessAccess;
    }
    async listBranches(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const result = await connection.query(`SELECT id, business_id, name, address, phone, qr_code_id, created_at, updated_at
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC`, [businessId]);
            const response = new branch_dto_1.BranchListResponseDto();
            response.branches = result.rows.map(this.mapRowToDto);
            response.total = result.rows.length;
            return response;
        });
    }
    async getBranch(userId, branchId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const result = await connection.query(`SELECT id, business_id, name, address, phone, qr_code_id, created_at, updated_at
         FROM branches
         WHERE id = $1 AND business_id = $2
         LIMIT 1`, [branchId, businessId]);
            if (!result.rows[0]) {
                throw new common_1.NotFoundException('Branch not found');
            }
            return this.mapRowToDto(result.rows[0]);
        });
    }
    async createBranch(userId, input) {
        const name = input.name.trim();
        if (!name) {
            throw new common_1.BadRequestException('Branch name is required');
        }
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const result = await connection.query(`INSERT INTO branches (business_id, name, address, phone, qr_code_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, business_id, name, address, phone, qr_code_id, created_at, updated_at`, [
                businessId,
                name,
                input.address?.trim() ?? null,
                input.phone?.trim() ?? null,
                (0, node_crypto_1.randomUUID)(),
            ]);
            await connection.query(`UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`, [businessId]);
            return this.mapRowToDto(result.rows[0]);
        });
    }
    async updateBranch(userId, branchId, input) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            // Verify branch exists and belongs to the business
            const existing = await connection.query('SELECT id FROM branches WHERE id = $1 AND business_id = $2 LIMIT 1', [branchId, businessId]);
            if (!existing.rows[0]) {
                throw new common_1.NotFoundException('Branch not found');
            }
            const assignments = [];
            const values = [];
            const add = (column, value) => {
                values.push(value);
                assignments.push(`${column} = $${values.length}`);
            };
            if (input.name !== undefined)
                add('name', input.name.trim());
            if (input.address !== undefined)
                add('address', input.address?.trim() ?? null);
            if (input.phone !== undefined)
                add('phone', input.phone?.trim() ?? null);
            if (assignments.length === 0) {
                // No fields to update
                return this.getBranch(userId, branchId);
            }
            values.push(branchId);
            const result = await connection.query(`UPDATE branches
         SET ${assignments.join(', ')}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING id, business_id, name, address, phone, qr_code_id, created_at, updated_at`, values);
            return this.mapRowToDto(result.rows[0]);
        });
    }
    async deleteBranch(userId, branchId) {
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            // Verify branch exists and belongs to the business
            const existing = await connection.query('SELECT id FROM branches WHERE id = $1 AND business_id = $2 LIMIT 1', [branchId, businessId]);
            if (!existing.rows[0]) {
                throw new common_1.NotFoundException('Branch not found');
            }
            // Prevent deletion of the last branch
            const branchCount = await connection.query('SELECT count(*)::int AS count FROM branches WHERE business_id = $1', [businessId]);
            if (branchCount.rows[0].count <= 1) {
                throw new common_1.BadRequestException('Cannot delete the only branch. At least one branch is required.');
            }
            // Check for dependent loyalty transactions
            const transactions = await connection.query('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1 AND business_id = $2', [branchId, businessId]);
            if (transactions.rows[0].count > 0) {
                throw new common_1.ConflictException('Cannot delete branch with existing loyalty transactions. Branch has dependent historical records.');
            }
            await connection.query('DELETE FROM branches WHERE id = $1 AND business_id = $2', [branchId, businessId]);
            await connection.query(`UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`, [businessId]);
        });
    }
    async getOwnedBusinessId(connection, userId) {
        const business = await this.businessAccess.findOwnedBusiness(connection, userId);
        if (!business) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business.id;
    }
    async lockOwnedBusiness(connection, userId) {
        const business = await this.businessAccess.lockOwnedBusinessForUpdate(connection, userId);
        if (!business) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business.id;
    }
    mapRowToDto(row) {
        const dto = new branch_dto_1.BranchResponseDto();
        dto.id = row.id;
        dto.businessId = row.business_id;
        dto.name = row.name;
        dto.address = row.address;
        dto.phone = row.phone;
        dto.qrCodeId = row.qr_code_id;
        dto.createdAt = row.created_at;
        dto.updatedAt = row.updated_at;
        return dto;
    }
};
exports.BranchService = BranchService;
exports.BranchService = BranchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService,
        business_access_service_1.BusinessAccessService])
], BranchService);
//# sourceMappingURL=branch.service.js.map