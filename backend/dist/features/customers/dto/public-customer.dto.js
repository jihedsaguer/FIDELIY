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
exports.ResolveBusinessQrDto = exports.PublicCustomerLookupDto = exports.PublicJoinBusinessDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * DTO for joining a business via public QR code.
 * Used by unauthenticated customers during onboarding.
 */
class PublicJoinBusinessDto {
}
exports.PublicJoinBusinessDto = PublicJoinBusinessDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PublicJoinBusinessDto.prototype, "qrId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PublicJoinBusinessDto.prototype, "branchQrId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 255),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PublicJoinBusinessDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PublicJoinBusinessDto.prototype, "birthdate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 8),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PublicJoinBusinessDto.prototype, "phoneNumber", void 0);
/**
 * DTO for looking up an existing customer by phone number.
 * Used to find existing customer account without creating duplicates.
 */
class PublicCustomerLookupDto {
}
exports.PublicCustomerLookupDto = PublicCustomerLookupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(8, 8),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PublicCustomerLookupDto.prototype, "phoneNumber", void 0);
/**
 * DTO for resolving business QR code.
 * Used by both public and merchant flows.
 */
class ResolveBusinessQrDto {
}
exports.ResolveBusinessQrDto = ResolveBusinessQrDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveBusinessQrDto.prototype, "qrId", void 0);
//# sourceMappingURL=public-customer.dto.js.map