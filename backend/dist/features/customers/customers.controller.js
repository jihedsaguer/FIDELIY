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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const customer_guard_1 = require("../../shared/guards/customer.guard");
const current_user_decorator_1 = require("../../shared/decorators/current-user.decorator");
const customer_membership_service_1 = require("./customer-membership.service");
const customer_membership_dto_1 = require("./dto/customer-membership.dto");
let CustomersController = class CustomersController {
    constructor(customerMemberships) {
        this.customerMemberships = customerMemberships;
    }
    /**
     * Get customer profile.
     * Requires CustomerGuard (authenticated user with customer account).
     *
     * Success: 200 OK with user and customer account info
     * No session: 401 Unauthorized
     * No customer account: 403 Forbidden
     */
    async getCustomerProfile(user) {
        return {
            message: '✅ Customer profile accessed',
            userId: user.id,
            customerAccount: user.customerAccount,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Test endpoint: Get customer dashboard.
     * Requires CustomerGuard.
     */
    async getCustomerDashboard(user) {
        return {
            message: '✅ Customer dashboard accessed',
            userId: user.id,
            timestamp: new Date().toISOString(),
            note: 'Loyalty transaction data would go here in production',
        };
    }
    discoverBusiness(user, businessQrId) {
        return this.customerMemberships.discoverBusiness(user.id, businessQrId);
    }
    discoverBranch(user, branchQrId) {
        return this.customerMemberships.discoverBranch(user.id, branchQrId);
    }
    joinBusiness(user, input) {
        return this.customerMemberships.joinBusiness(user.id, input);
    }
    listMemberships(user) {
        return this.customerMemberships.listMemberships(user.id);
    }
    getMembership(user, membershipId) {
        return this.customerMemberships.getMembership(user.id, membershipId);
    }
    leaveMembership(user, membershipId) {
        return this.customerMemberships.leaveMembership(user.id, membershipId);
    }
    getPersonalQrCredential(user) {
        return this.customerMemberships.getPersonalQrCredential(user.id);
    }
    issuePersonalQrCredential(user) {
        return this.customerMemberships.issuePersonalQrCredential(user.id);
    }
    rotatePersonalQrCredential(user) {
        return this.customerMemberships.rotatePersonalQrCredential(user.id);
    }
    /**
     * Public endpoint: Check customer service status.
     * No authentication required.
     */
    async getHealth() {
        return {
            service: 'customer',
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Get)('/profile'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerProfile", null);
__decorate([
    (0, common_1.Get)('/dashboard'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerDashboard", null);
__decorate([
    (0, common_1.Get)('/businesses/qr/:businessQrId'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('businessQrId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "discoverBusiness", null);
__decorate([
    (0, common_1.Get)('/branches/qr/:branchQrId'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('branchQrId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "discoverBranch", null);
__decorate([
    (0, common_1.Post)('/memberships'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, customer_membership_dto_1.JoinBusinessDto]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "joinBusiness", null);
__decorate([
    (0, common_1.Get)('/memberships'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "listMemberships", null);
__decorate([
    (0, common_1.Get)('/memberships/:membershipId'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('membershipId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "getMembership", null);
__decorate([
    (0, common_1.Post)('/memberships/:membershipId/leave'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('membershipId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "leaveMembership", null);
__decorate([
    (0, common_1.Get)('/personal-qr'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "getPersonalQrCredential", null);
__decorate([
    (0, common_1.Post)('/personal-qr'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "issuePersonalQrCredential", null);
__decorate([
    (0, common_1.Post)('/personal-qr/rotate'),
    (0, common_1.UseGuards)(customer_guard_1.CustomerGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "rotatePersonalQrCredential", null);
__decorate([
    (0, common_1.Get)('/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getHealth", null);
exports.CustomersController = CustomersController = __decorate([
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [customer_membership_service_1.CustomerMembershipService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map