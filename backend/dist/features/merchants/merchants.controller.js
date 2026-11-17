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
exports.MerchantsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const merchant_guard_1 = require("../../shared/guards/merchant.guard");
const current_user_decorator_1 = require("../../shared/decorators/current-user.decorator");
const business_setup_dto_1 = require("./dto/business-setup.dto");
const branch_dto_1 = require("./dto/branch.dto");
const business_setup_service_1 = require("./business-setup.service");
const branch_service_1 = require("./branch.service");
const merchant_customer_service_1 = require("./merchant-customer.service");
const merchant_transaction_service_1 = require("./merchant-transaction.service");
const resolve_customer_qr_dto_1 = require("./dto/resolve-customer-qr.dto");
const merchant_transaction_dto_1 = require("./dto/merchant-transaction.dto");
/**
 * Merchant profile and owner-scoped business setup endpoints.
 */
let MerchantsController = class MerchantsController {
    constructor(businessSetupService, branchService, merchantCustomers, merchantTransactions) {
        this.businessSetupService = businessSetupService;
        this.branchService = branchService;
        this.merchantCustomers = merchantCustomers;
        this.merchantTransactions = merchantTransactions;
    }
    /**
     * Test endpoint: Get merchant profile.
     * Requires MerchantGuard (authenticated user with merchant account).
     *
     * Success: 200 OK with user and merchant account info
     * No session: 401 Unauthorized
     * No merchant account: 403 Forbidden
     */
    async getMerchantProfile(user) {
        return {
            message: '✅ Merchant profile accessed',
            userId: user.id,
            merchantAccount: user.merchantAccount,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Test endpoint: Get merchant dashboard.
     * Requires MerchantGuard.
     */
    async getMerchantDashboard(user) {
        return {
            message: '✅ Merchant dashboard accessed',
            userId: user.id,
            timestamp: new Date().toISOString(),
            note: 'Program configuration and analytics would go here in production',
        };
    }
    getBusinessSetup(user) {
        return this.businessSetupService.getSetup(user.id);
    }
    createBusiness(user, input) {
        return this.businessSetupService.createBusiness(user.id, input);
    }
    updateBusiness(user, input) {
        return this.businessSetupService.updateBusiness(user.id, input);
    }
    createFirstBranch(user, input) {
        return this.businessSetupService.createFirstBranch(user.id, input);
    }
    updateFirstBranch(user, input) {
        return this.businessSetupService.updateFirstBranch(user.id, input);
    }
    completeBusinessSetup(user) {
        return this.businessSetupService.completeSetup(user.id);
    }
    resolveCustomerQr(user, input) {
        return this.merchantCustomers.resolveCustomerQr(user.id, input.credential);
    }
    /**
     * Resolve a customer QR for a loyalty transaction.
     * Returns customer info, balance, programme details, and eligible rewards.
     */
    resolveCustomerForTransaction(user, input) {
        return this.merchantTransactions.resolveCustomerForTransaction(user.id, input.qrCredential, input.branchId);
    }
    /**
     * Calculate loyalty earnings for a purchase amount.
     * Returns the stamps and points that would be earned.
     */
    calculateEarnings(user, input) {
        return this.merchantTransactions.calculateEarnings(user.id, input);
    }
    /**
     * Create a loyalty transaction for a customer.
     * Records stamps and/or points earned from a purchase.
     */
    createLoyaltyTransaction(user, input) {
        return this.merchantTransactions.createLoyaltyTransaction(user.id, input);
    }
    /**
     * Redeem a reward for a customer.
     * Deducts the reward cost from the customer's balance.
     */
    redeemReward(user, input) {
        return this.merchantTransactions.redeemReward(user.id, input);
    }
    /**
     * Upload a device-based logo for the authenticated merchant's business.
     * Requires MerchantGuard and a valid image file.
     *
     * Request: multipart/form-data with file field
     * Success: 200 OK with logo metadata (storage key, dimensions, MIME type)
     * Validation: 400 Bad Request if file is invalid (size, format, content)
     * No business: 404 Not Found
     */
    async uploadLogo(user, file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const result = await this.businessSetupService.uploadLogo(user.id, file.buffer, file.mimetype);
        return {
            storageKey: result.storageKey,
            filename: result.filename,
            width: result.width,
            height: result.height,
            mimeType: result.mimeType,
            uploadedAt: result.uploadedAt,
        };
    }
    /**
     * Retrieve the authenticated merchant's business logo.
     * Requires MerchantGuard.
     *
     * Success: 200 OK with image file and appropriate Content-Type header
     * No logo: 404 Not Found
     */
    async getLogo(user, res) {
        const setup = await this.businessSetupService.getSetup(user.id);
        if (!setup.business) {
            throw new common_1.BadRequestException('Business not found');
        }
        const logo = await this.businessSetupService.getLogo(setup.business.id, user.id);
        res.setHeader('Content-Type', logo.contentType);
        res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(logo.content);
    }
    /**
     * List all branches for the authenticated merchant's business.
     */
    async listBranches(user) {
        return this.branchService.listBranches(user.id);
    }
    /**
     * Get a specific branch by ID.
     */
    async getBranch(user, branchId) {
        return this.branchService.getBranch(user.id, branchId);
    }
    /**
     * Create a new branch for the authenticated merchant's business.
     */
    async createBranch(user, input) {
        return this.branchService.createBranch(user.id, input);
    }
    /**
     * Update an existing branch.
     */
    async updateBranch(user, branchId, input) {
        return this.branchService.updateBranch(user.id, branchId, input);
    }
    /**
     * Delete a branch.
     */
    async deleteBranch(user, branchId) {
        await this.branchService.deleteBranch(user.id, branchId);
        return {
            success: true,
            message: 'Branch deleted successfully',
        };
    }
    /**
     * Public endpoint: Check merchant service status.
     * No authentication required.
     */
    async getHealth() {
        return {
            service: 'merchant',
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.MerchantsController = MerchantsController;
__decorate([
    (0, common_1.Get)('/profile'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getMerchantProfile", null);
__decorate([
    (0, common_1.Get)('/dashboard'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getMerchantDashboard", null);
__decorate([
    (0, common_1.Get)('business-setup'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "getBusinessSetup", null);
__decorate([
    (0, common_1.Post)('business-setup/business'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, business_setup_dto_1.CreateBusinessDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "createBusiness", null);
__decorate([
    (0, common_1.Patch)('business-setup/business'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, business_setup_dto_1.UpdateBusinessSetupDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "updateBusiness", null);
__decorate([
    (0, common_1.Post)('business-setup/first-branch'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, business_setup_dto_1.CreateFirstBranchDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "createFirstBranch", null);
__decorate([
    (0, common_1.Patch)('business-setup/first-branch'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, business_setup_dto_1.UpdateFirstBranchDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "updateFirstBranch", null);
__decorate([
    (0, common_1.Post)('business-setup/complete'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "completeBusinessSetup", null);
__decorate([
    (0, common_1.Post)('customers/resolve-qr'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, resolve_customer_qr_dto_1.ResolveCustomerQrDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "resolveCustomerQr", null);
__decorate([
    (0, common_1.Post)('customers/resolve-for-transaction'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, merchant_transaction_dto_1.ResolveCustomerForTransactionDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "resolveCustomerForTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/calculate-earnings'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, merchant_transaction_dto_1.CalculateEarningsDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "calculateEarnings", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, merchant_transaction_dto_1.CreateLoyaltyTransactionDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "createLoyaltyTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/redeem-reward'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, merchant_transaction_dto_1.RedeemRewardDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "redeemReward", null);
__decorate([
    (0, common_1.Post)('business-setup/business/logo'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: undefined })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Get)('business-setup/business/logo'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getLogo", null);
__decorate([
    (0, common_1.Get)('branches'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "listBranches", null);
__decorate([
    (0, common_1.Get)('branches/:branchId'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getBranch", null);
__decorate([
    (0, common_1.Post)('branches'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, branch_dto_1.CreateBranchDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "createBranch", null);
__decorate([
    (0, common_1.Patch)('branches/:branchId'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, branch_dto_1.UpdateBranchDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "updateBranch", null);
__decorate([
    (0, common_1.Delete)('branches/:branchId'),
    (0, common_1.UseGuards)(merchant_guard_1.MerchantGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "deleteBranch", null);
__decorate([
    (0, common_1.Get)('/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getHealth", null);
exports.MerchantsController = MerchantsController = __decorate([
    (0, common_1.Controller)('merchants'),
    __metadata("design:paramtypes", [business_setup_service_1.BusinessSetupService,
        branch_service_1.BranchService,
        merchant_customer_service_1.MerchantCustomerService,
        merchant_transaction_service_1.MerchantTransactionService])
], MerchantsController);
//# sourceMappingURL=merchants.controller.js.map