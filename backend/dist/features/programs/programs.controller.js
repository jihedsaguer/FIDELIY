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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgramsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../shared/decorators/current-user.decorator");
const merchant_guard_1 = require("../../shared/guards/merchant.guard");
const program_configuration_dto_1 = require("./dto/program-configuration.dto");
const program_configuration_v2_dto_1 = require("./dto/program-configuration-v2.dto");
const programs_service_1 = require("./programs.service");
let ProgramsController = class ProgramsController {
    constructor(programsService) {
        this.programsService = programsService;
    }
    /**
     * Get the current active programme for the merchant's business.
     */
    getCurrent(user) {
        return this.programsService.getCurrent(user.id);
    }
    /**
     * Get all programmes (current and historical) for the merchant's business.
     */
    getHistory(user) {
        return this.programsService.getHistory(user.id);
    }
    /**
     * Get a specific programme by ID.
     */
    getProgram(user, programId) {
        return this.programsService.getProgram(user.id, programId);
    }
    /**
     * List all programmes for the merchant's business.
     */
    listPrograms(user) {
        return this.programsService.listPrograms(user.id);
    }
    /**
     * Create the initial programme for the merchant's business.
     * Only succeeds if no active programme exists.
     * Uses the original JSON-based configuration format.
     */
    createInitial(user, input) {
        return this.programsService.createInitial(user.id, input);
    }
    /**
     * Create a new programme version.
     * Deactivates the current active programme and creates a new one.
     * Uses the original JSON-based configuration format.
     */
    createVersion(user, input) {
        return this.programsService.createVersion(user.id, input);
    }
    /**
     * Create a new programme with enhanced configuration.
     * Uses structured DTOs for stamps and points programmes.
     */
    createEnhanced(user, input) {
        return this.programsService.createEnhanced(user.id, input);
    }
    /**
     * Update a programme's metadata (name, description).
     * Does not modify the programme configuration.
     */
    updateProgram(user, programId, input) {
        return this.programsService.updateProgram(user.id, programId, input);
    }
    /**
     * Deactivate a programme.
     * Only the current active programme can be deactivated.
     */
    deactivateProgram(user, programId) {
        return this.programsService.deactivateProgram(user.id, programId);
    }
    /**
     * Delete a programme.
     * Only inactive programmes can be deleted.
     */
    deleteProgram(user, programId) {
        return this.programsService.deleteProgram(user.id, programId);
    }
};
exports.ProgramsController = ProgramsController;
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)(':programId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('programId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "getProgram", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "listPrograms", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, program_configuration_dto_1.ProgramConfigurationDto]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "createInitial", null);
__decorate([
    (0, common_1.Post)('versions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, program_configuration_dto_1.ProgramConfigurationDto]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "createVersion", null);
__decorate([
    (0, common_1.Post)('enhanced'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, program_configuration_v2_dto_1.ProgramConfigurationV2Dto]),
    __metadata("design:returntype", void 0)
], ProgramsController.prototype, "createEnhanced", null);
__decorate([
    (0, common_1.Patch)(':programId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('programId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "updateProgram", null);
__decorate([
    (0, common_1.Patch)(':programId/deactivate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('programId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "deactivateProgram", null);
__decorate([
    (0, common_1.Delete)(':programId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('programId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProgramsController.prototype, "deleteProgram", null);
exports.ProgramsController = ProgramsController = __decorate([
    (0, common_1.Controller)('programs'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __metadata("design:paramtypes", [programs_service_1.ProgramsService])
], ProgramsController);
//# sourceMappingURL=programs.controller.js.map