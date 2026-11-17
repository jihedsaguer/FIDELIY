import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../../shared/database/tenant-context.service';
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
export declare class CustomerGuard implements CanActivate {
    private tenantContextService;
    constructor(tenantContextService: TenantContextService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=customer.guard.d.ts.map