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
exports.StampProgramConfigurationDto = exports.StampRewardThresholdDto = exports.StampEarningRuleDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
/**
 * DTO for stamp-based programme earning rule
 */
class StampEarningRuleDto {
}
exports.StampEarningRuleDto = StampEarningRuleDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], StampEarningRuleDto.prototype, "purchasesPerStamp", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], StampEarningRuleDto.prototype, "description", void 0);
/**
 * DTO for stamp-based programme reward threshold
 */
class StampRewardThresholdDto {
}
exports.StampRewardThresholdDto = StampRewardThresholdDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], StampRewardThresholdDto.prototype, "stampsRequired", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], StampRewardThresholdDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], StampRewardThresholdDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], StampRewardThresholdDto.prototype, "isActive", void 0);
/**
 * DTO for stamp programme configuration
 */
class StampProgramConfigurationDto {
}
exports.StampProgramConfigurationDto = StampProgramConfigurationDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => StampEarningRuleDto),
    __metadata("design:type", StampEarningRuleDto)
], StampProgramConfigurationDto.prototype, "earningRule", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => StampRewardThresholdDto),
    __metadata("design:type", Array)
], StampProgramConfigurationDto.prototype, "rewardThresholds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], StampProgramConfigurationDto.prototype, "stampExpirationDays", void 0);
//# sourceMappingURL=stamp-program.dto.js.map