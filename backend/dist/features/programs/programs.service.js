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
exports.ProgramsService = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
let ProgramsService = class ProgramsService {
    constructor(tenantContext) {
        this.tenantContext = tenantContext;
    }
    getCurrent(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const programs = await this.loadPrograms(connection, businessId, true);
            return programs[0] ? this.mapToResponseDto(programs[0]) : null;
        });
    }
    getHistory(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const programs = await this.loadPrograms(connection, businessId);
            return programs.map(this.mapToResponseDto);
        });
    }
    async createInitial(userId, input) {
        this.validateConfigurations(input);
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const activeProgram = await connection.query(`SELECT id
         FROM programs
         WHERE business_id = $1 AND status = 'active'
         LIMIT 1`, [businessId]);
            if (activeProgram.rows[0]) {
                throw new common_1.ConflictException('An active programme already exists');
            }
            const version = await this.nextVersion(connection, businessId);
            const program = await this.insertProgram(connection, businessId, version, input);
            return this.mapToResponseDto(program);
        });
    }
    async createVersion(userId, input) {
        this.validateConfigurations(input);
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const activeProgram = await connection.query(`SELECT id
         FROM programs
         WHERE business_id = $1 AND status = 'active'
         FOR UPDATE`, [businessId]);
            if (!activeProgram.rows[0]) {
                throw new common_1.NotFoundException('Active programme not found');
            }
            const version = await this.nextVersion(connection, businessId);
            await connection.query(`UPDATE programs
         SET status = 'inactive', deactivated_at = now()
         WHERE id = $1`, [activeProgram.rows[0].id]);
            const program = await this.insertProgram(connection, businessId, version, input);
            return this.mapToResponseDto(program);
        });
    }
    validateConfigurations(input) {
        const enabledTypes = input.type === 'both'
            ? ['stamps', 'points']
            : input.type === 'stamps' || input.type === 'points'
                ? [input.type]
                : [];
        if (!enabledTypes.length) {
            throw new common_1.BadRequestException('Programme type is invalid');
        }
        const configurations = input.configurations;
        if (!configurations || typeof configurations !== 'object' || Array.isArray(configurations)) {
            throw new common_1.BadRequestException('Programme configurations must be an object');
        }
        const suppliedTypes = Object.keys(configurations);
        if (suppliedTypes.length !== enabledTypes.length ||
            enabledTypes.some((type) => !suppliedTypes.includes(type)) ||
            suppliedTypes.some((type) => !enabledTypes.includes(type))) {
            throw new common_1.BadRequestException('Provide exactly one configuration for each enabled programme type');
        }
        for (const type of enabledTypes) {
            const settings = configurations[type];
            if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
                throw new common_1.BadRequestException(`The ${type} configuration must be an object`);
            }
        }
    }
    async getOwnedBusinessId(connection, userId) {
        const result = await connection.query(`SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       LIMIT 1`, [userId]);
        const businessId = result.rows[0]?.id;
        if (!businessId) {
            throw new common_1.NotFoundException('Business not found');
        }
        return businessId;
    }
    async lockOwnedBusiness(connection, userId) {
        const result = await connection.query(`SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR UPDATE OF b`, [userId]);
        const businessId = result.rows[0]?.id;
        if (!businessId) {
            throw new common_1.NotFoundException('Business not found');
        }
        return businessId;
    }
    async nextVersion(connection, businessId) {
        const result = await connection.query(`SELECT COALESCE(MAX(version), 0)::int + 1 AS version
       FROM programs
       WHERE business_id = $1`, [businessId]);
        return result.rows[0].version;
    }
    async insertProgram(connection, businessId, version, input) {
        const result = await connection.query(`INSERT INTO programs (business_id, name, description, type, version, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id,
                 business_id AS "businessId",
                 name,
                 description,
                 type,
                 version,
                 status,
                 activated_at AS "activatedAt",
                 deactivated_at AS "deactivatedAt",
                 created_at AS "createdAt"`, [businessId, input.name ?? null, input.description ?? null, input.type, version]);
        const program = result.rows[0];
        for (const type of this.enabledTypes(input.type)) {
            await connection.query(`INSERT INTO program_configurations (program_id, type, settings)
         VALUES ($1, $2, $3::jsonb)`, [
                program.id,
                type,
                JSON.stringify(input.configurations[type]),
            ]);
        }
        return {
            ...program,
            configurations: this.enabledTypes(input.type).map((type) => ({
                type,
                settings: input.configurations[type],
            })),
        };
    }
    async loadPrograms(connection, businessId, activeOnly = false) {
        const activeFilter = activeOnly ? "AND p.status = 'active'" : '';
        const result = await connection.query(`SELECT p.id,
              p.business_id AS "businessId",
              p.name,
              p.description,
              p.type,
              p.version,
              p.status,
              p.activated_at AS "activatedAt",
              p.deactivated_at AS "deactivatedAt",
              p.created_at AS "createdAt",
              pc.type AS "configurationType",
              pc.settings
       FROM programs p
       LEFT JOIN program_configurations pc ON pc.program_id = p.id
       WHERE p.business_id = $1 ${activeFilter}
       ORDER BY p.version DESC,
                CASE pc.type WHEN 'stamps' THEN 0 WHEN 'points' THEN 1 END`, [businessId]);
        const programs = new Map();
        for (const row of result.rows) {
            let program = programs.get(row.id);
            if (!program) {
                program = {
                    id: row.id,
                    businessId: row.businessId,
                    name: row.name,
                    description: row.description,
                    type: row.type,
                    version: row.version,
                    status: row.status,
                    activatedAt: row.activatedAt,
                    deactivatedAt: row.deactivatedAt,
                    createdAt: row.createdAt,
                    configurations: [],
                };
                programs.set(row.id, program);
            }
            if (row.configurationType && program) {
                program.configurations.push({
                    type: row.configurationType,
                    settings: row.settings ?? {},
                });
            }
        }
        return Array.from(programs.values());
    }
    enabledTypes(type) {
        return type === 'both' ? ['stamps', 'points'] : [type];
    }
    async getProgram(userId, programId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const programs = await this.loadPrograms(connection, businessId);
            const program = programs.find((p) => p.id === programId);
            if (!program) {
                throw new common_1.NotFoundException('Programme not found');
            }
            return this.mapToResponseDto(program);
        });
    }
    async listPrograms(userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const programs = await this.loadPrograms(connection, businessId);
            return {
                programs: programs.map(this.mapToResponseDto),
                total: programs.length,
            };
        });
    }
    async createEnhanced(userId, input) {
        const configurations = {};
        if (input.stamps) {
            configurations.stamps = {
                earningRule: input.stamps.earningRule,
                rewardThresholds: input.stamps.rewardThresholds,
                stampExpirationDays: input.stamps.stampExpirationDays,
            };
        }
        if (input.points) {
            configurations.points = {
                earningRule: input.points.earningRule,
                rewardThresholds: input.points.rewardThresholds,
                pointsExpirationDays: input.points.pointsExpirationDays,
            };
        }
        const baseInput = {
            type: input.type,
            configurations,
            name: input.name,
            description: input.description,
        };
        // Check if there's an active programme to determine whether to create initial or version
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const activeProgram = await connection.query(`SELECT id
         FROM programs
         WHERE business_id = $1 AND status = 'active'
         LIMIT 1`, [businessId]);
            if (activeProgram.rows[0]) {
                // There's an active programme, create a new version
                return this.createVersion(userId, baseInput);
            }
            else {
                // No active programme, create the initial one
                return this.createInitial(userId, baseInput);
            }
        });
    }
    async updateProgram(userId, programId, input) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.getOwnedBusinessId(connection, userId);
            const existing = await connection.query('SELECT id, business_id FROM programs WHERE id = $1 AND business_id = $2 LIMIT 1', [programId, businessId]);
            if (!existing.rows[0]) {
                throw new common_1.NotFoundException('Programme not found');
            }
            const assignments = [];
            const values = [];
            const add = (column, value) => {
                values.push(value);
                assignments.push(`${column} = $${values.length}`);
            };
            if (input.name !== undefined)
                add('name', input.name);
            if (input.description !== undefined)
                add('description', input.description);
            if (assignments.length) {
                values.push(programId);
                await connection.query(`UPDATE programs
           SET ${assignments.join(', ')}
           WHERE id = $${values.length}`, values);
            }
            const programs = await this.loadPrograms(connection, businessId);
            const program = programs.find((p) => p.id === programId);
            if (!program) {
                throw new common_1.NotFoundException('Programme not found');
            }
            return this.mapToResponseDto(program);
        });
    }
    async deactivateProgram(userId, programId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const existing = await connection.query('SELECT id, business_id, status FROM programs WHERE id = $1 AND business_id = $2 AND status = $3 LIMIT 1', [programId, businessId, 'active']);
            if (!existing.rows[0]) {
                throw new common_1.NotFoundException('Active programme not found or already deactivated');
            }
            await connection.query(`UPDATE programs
         SET status = 'inactive', deactivated_at = now()
         WHERE id = $1`, [programId]);
            return {
                success: true,
                message: 'Programme deactivated successfully',
            };
        });
    }
    async deleteProgram(userId, programId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const existing = await connection.query('SELECT id, business_id, status FROM programs WHERE id = $1 AND business_id = $2 AND status = $3 LIMIT 1 FOR UPDATE', [programId, businessId, 'inactive']);
            if (!existing.rows[0]) {
                throw new common_1.NotFoundException('Programme not found or cannot be deleted (only inactive programmes can be deleted)');
            }
            const activityCheck = await connection.query(`SELECT COUNT(*)::int AS count
         FROM loyalty_activity_entries lae
         JOIN program_configurations pc ON pc.id = lae.program_configuration_id
         WHERE pc.program_id = $1`, [programId]);
            if (activityCheck.rows[0].count > 0) {
                throw new common_1.ConflictException('Cannot delete programme: it has historical loyalty activity. Programmes with transactions must be preserved for audit integrity.');
            }
            // Delete configurations first (foreign key constraint)
            await connection.query('DELETE FROM program_configurations WHERE program_id = $1', [programId]);
            await connection.query('DELETE FROM programs WHERE id = $1', [programId]);
            return {
                success: true,
                message: 'Programme deleted successfully',
            };
        });
    }
    mapToResponseDto(program) {
        const configurations = {
            stamps: {},
            points: {},
        };
        for (const config of program.configurations) {
            configurations[config.type] = config.settings;
        }
        return {
            id: program.id,
            businessId: program.businessId,
            name: program.name,
            description: program.description,
            type: program.type,
            version: program.version,
            status: program.status,
            activatedAt: program.activatedAt,
            deactivatedAt: program.deactivatedAt,
            createdAt: program.createdAt,
            configurations,
        };
    }
};
exports.ProgramsService = ProgramsService;
exports.ProgramsService = ProgramsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService])
], ProgramsService);
//# sourceMappingURL=programs.service.js.map