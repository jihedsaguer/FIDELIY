import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../../shared/database/tenant-context.service';
/**
 * Phase 1B (Corrected): Merchant Guard
 *
 * Verifies that an authenticated user has a merchant capability record.
 *
 * Security Model:
 * 1. Check: request.user.id exists (established by SessionValidationMiddleware)
 * 2. userId originates exclusively from server-side session validation
 * 3. Query merchant_accounts in transaction-local RLS context
 * 4. Transaction opens for capability check, closes immediately after
 * 5. Return true if merchant account exists, throw 403 otherwise
 *
 * Usage:
 * @Get('/businesses')
 * @UseGuards(MerchantGuard)
 * async getBusinesses(@CurrentUser() user: CurrentUserPayload) { ... }
 *
 * Access Control:
 * - Authenticated users without merchant capability: 403 Forbidden
 * - Unauthenticated users: 401 Unauthorized
 * - Database errors: 401 Unauthorized (fail-closed)
 *
 * Multi-Capability:
 * A user can have both customer and merchant capabilities.
 * This guard only checks for merchant capability.
 * Guards are independent and can be combined.
 */
export declare class MerchantGuard implements CanActivate {
    private tenantContextService;
    constructor(tenantContextService: TenantContextService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=merchant.guard.d.ts.map