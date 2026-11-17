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
exports.ProgramListResponseDto = exports.ProgramResponseDto = exports.ProgramConfigurationV2Dto = exports.ProgramConfigurationDtoV1 = exports.PROGRAM_TYPES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const stamp_program_dto_1 = require("./stamp-program.dto");
const points_program_dto_1 = require("./points-program.dto");
exports.PROGRAM_TYPES = ['stamps', 'points', 'both'];
/**
 * Simplified programme configuration for backwards compatibility
 * This uses the original JSON-based approach but with better validation
 */
class ProgramConfigurationDtoV1 {
}
exports.ProgramConfigurationDtoV1 = ProgramConfigurationDtoV1;
__decorate([
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_1.IsIn)(exports.PROGRAM_TYPES),
    __metadata("design:type", String)
], ProgramConfigurationDtoV1.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ProgramConfigurationDtoV1.prototype, "configurations", void 0);
/**
 * Enhanced programme configuration with structured DTOs
 * This provides better type safety and validation for stamps and points programmes
 */
class ProgramConfigurationV2Dto {
}
exports.ProgramConfigurationV2Dto = ProgramConfigurationV2Dto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ProgramConfigurationV2Dto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ProgramConfigurationV2Dto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_1.IsIn)(exports.PROGRAM_TYPES),
    __metadata("design:type", String)
], ProgramConfigurationV2Dto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type === 'stamps' || o.type === 'both'),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => stamp_program_dto_1.StampProgramConfigurationDto),
    __metadata("design:type", stamp_program_dto_1.StampProgramConfigurationDto)
], ProgramConfigurationV2Dto.prototype, "stamps", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type === 'points' || o.type === 'both'),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => points_program_dto_1.PointsProgramConfigurationDto),
    __metadata("design:type", points_program_dto_1.PointsProgramConfigurationDto)
], ProgramConfigurationV2Dto.prototype, "points", void 0);
/**
 * Response DTO for programme details
 */
class ProgramResponseDto {
}
exports.ProgramResponseDto = ProgramResponseDto;
/**
 * Response DTO for programme list
 */
class ProgramListResponseDto {
}
exports.ProgramListResponseDto = ProgramListResponseDto;
//# sourceMappingURL=program-configuration-v2.dto.js.map