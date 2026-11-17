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
exports.PointsProgramConfigurationDto = exports.PointsRewardThresholdDto = exports.PointsEarningRuleDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
/**
 * DTO for points-based programme earning rule
 */
class PointsEarningRuleDto {
}
exports.PointsEarningRuleDto = PointsEarningRuleDto;
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], PointsEarningRuleDto.prototype, "pointsPerCurrencyUnit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], PointsEarningRuleDto.prototype, "currencyCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], PointsEarningRuleDto.prototype, "description", void 0);
/**
 * DTO for points-based programme reward threshold
 */
class PointsRewardThresholdDto {
}
exports.PointsRewardThresholdDto = PointsRewardThresholdDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PointsRewardThresholdDto.prototype, "pointsRequired", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PointsRewardThresholdDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], PointsRewardThresholdDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], PointsRewardThresholdDto.prototype, "isActive", void 0);
/**
 * DTO for points programme configuration
 */
class PointsProgramConfigurationDto {
}
exports.PointsProgramConfigurationDto = PointsProgramConfigurationDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PointsEarningRuleDto),
    __metadata("design:type", PointsEarningRuleDto)
], PointsProgramConfigurationDto.prototype, "earningRule", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PointsRewardThresholdDto),
    __metadata("design:type", Array)
], PointsProgramConfigurationDto.prototype, "rewardThresholds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], PointsProgramConfigurationDto.prototype, "pointsExpirationDays", void 0);
//# sourceMappingURL=points-program.dto.js.map