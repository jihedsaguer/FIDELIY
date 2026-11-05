import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
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
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private tenantContextService: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if user is authenticated (session validation middleware should have run)
    // userId MUST originate exclusively from server-side session, never client-supplied
    if (!request.user?.id) {
      throw new UnauthorizedException('No authentication session found');
    }

    const userId = request.user.id;

    try {
      // Query customer_accounts table within transaction-local RLS context
      // Each capability check gets its own transaction
      // Transaction opens, RLS context set, query executes, transaction closes
      const customerAccount = await this.tenantContextService.querySingleWithContext<{
        id: string;
      }>(
        userId,
        'SELECT id FROM customer_accounts WHERE user_id = $1',
        [userId],
      );

      if (!customerAccount) {
        throw new ForbiddenException(
          'User does not have a customer account. Create one first.',
        );
      }

      // Attach customer account to request for use in endpoint handlers
      request.user.customerAccount = customerAccount;

      return true;
      // ← Transaction CLOSED here; connection released to pool
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      // Database or unexpected error
      // Fail-closed: treat as authentication failure, not data error
      throw new UnauthorizedException('Failed to verify customer status');
      // ← Transaction ROLLED BACK in finally block of executeWithContext
    }
  }
}
