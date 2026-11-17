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
exports.CorrectTransactionDto = exports.ListCustomerTransactionsDto = exports.RedeemRewardDto = exports.CreateLoyaltyTransactionDto = exports.CalculateEarningsDto = exports.ResolveCustomerForTransactionDto = void 0;
const class_validator_1 = require("class-validator");
/**
 * DTO for resolving a customer QR and preparing a loyalty transaction.
 */
class ResolveCustomerForTransactionDto {
}
exports.ResolveCustomerForTransactionDto = ResolveCustomerForTransactionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveCustomerForTransactionDto.prototype, "qrCredential", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResolveCustomerForTransactionDto.prototype, "branchId", void 0);
/**
 * DTO for calculating loyalty earnings from a purchase.
 */
class CalculateEarningsDto {
}
exports.CalculateEarningsDto = CalculateEarningsDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CalculateEarningsDto.prototype, "membershipId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CalculateEarningsDto.prototype, "purchaseAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateEarningsDto.prototype, "branchId", void 0);
/**
 * DTO for creating a loyalty transaction.
 */
class CreateLoyaltyTransactionDto {
}
exports.CreateLoyaltyTransactionDto = CreateLoyaltyTransactionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLoyaltyTransactionDto.prototype, "membershipId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateLoyaltyTransactionDto.prototype, "purchaseAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLoyaltyTransactionDto.prototype, "stampsEarned", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLoyaltyTransactionDto.prototype, "pointsEarned", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateLoyaltyTransactionDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Max)(128),
    __metadata("design:type", String)
], CreateLoyaltyTransactionDto.prototype, "idempotencyKey", void 0);
/**
 * DTO for redeeming a reward.
 */
class RedeemRewardDto {
}
exports.RedeemRewardDto = RedeemRewardDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RedeemRewardDto.prototype, "membershipId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RedeemRewardDto.prototype, "rewardId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RedeemRewardDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Max)(128),
    __metadata("design:type", String)
], RedeemRewardDto.prototype, "idempotencyKey", void 0);
/**
 * DTO for listing customer loyalty transactions.
 */
class ListCustomerTransactionsDto {
}
exports.ListCustomerTransactionsDto = ListCustomerTransactionsDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ListCustomerTransactionsDto.prototype, "membershipId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListCustomerTransactionsDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListCustomerTransactionsDto.prototype, "offset", void 0);
/**
 * DTO for correcting/reversing a transaction.
 */
class CorrectTransactionDto {
}
exports.CorrectTransactionDto = CorrectTransactionDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CorrectTransactionDto.prototype, "originalTransactionId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CorrectTransactionDto.prototype, "membershipId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CorrectTransactionDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CorrectTransactionDto.prototype, "branchId", void 0);
//# sourceMappingURL=merchant-transaction.dto.js.map