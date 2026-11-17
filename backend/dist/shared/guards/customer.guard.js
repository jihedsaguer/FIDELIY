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
exports.CustomerGuard = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
/**
 * Phase 1B (Corrected): Customer Guard
 *
 * Verifies that an authenticated user has a customer capability record.
 *
 * Security Model:
 * 1. Check: request.user.id exists (established by SessionValidationMiddleware)
 * 2. userId originates exclusively from server-side session validation
 * 3. Query customer_accounts in transaction-local RLS context
 * 4. Transaction opens for capability check, closes immediately after
 * 5. Return true if customer account exists, throw 403 otherwise
 *
 * Usage:
 * @Get('/profile')
 * @UseGuards(CustomerGuard)
 * async getProfile(@CurrentUser() user: CurrentUserPayload) { ... }
 *
 * Access Control:
 * - Authenticated users without customer capability: 403 Forbidden
 * - Unauthenticated users: 401 Unauthorized
 * - Database errors: 401 Unauthorized (fail-closed)
 *
 * Multi-Capability:
 * A user can have both customer and merchant capabilities.
 * This guard only checks for customer capability.
 * Guards are independent and can be combined.
 */
let CustomerGuard = class CustomerGuard {
    constructor(tenantContextService) {
        this.tenantContextService = tenantContextService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        // Check if user is authenticated (session validation middleware should have run)
        // userId MUST originate exclusively from server-side session, never client-supplied
        if (!request.user?.id) {
            throw new common_1.UnauthorizedException('No authentication session found');
        }
        const userId = request.user.id;
        try {
            // Query customer_accounts table within transaction-local RLS context
            // Each capability check gets its own transaction
            // Transaction opens, RLS context set, query executes, transaction closes
            const customerAccount = await this.tenantContextService.querySingleWithContext(userId, 'SELECT id FROM customer_accounts WHERE user_id = $1', [userId]);
            if (!customerAccount) {
                throw new common_1.ForbiddenException('User does not have a customer account. Create one first.');
            }
            // Attach customer account to request for use in endpoint handlers
            request.user.customerAccount = customerAccount;
            return true;
            // ← Transaction CLOSED here; connection released to pool
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            // Database or unexpected error
            // Fail-closed: treat as authentication failure, not data error
            throw new common_1.UnauthorizedException('Failed to verify customer status');
            // ← Transaction ROLLED BACK in finally block of executeWithContext
        }
    }
};
exports.CustomerGuard = CustomerGuard;
exports.CustomerGuard = CustomerGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService])
], CustomerGuard);
//# sourceMappingURL=customer.guard.js.map