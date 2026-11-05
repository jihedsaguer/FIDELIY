import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Phase 1B: CurrentUser Decorator
 *
 * Extracts the authenticated user from the request context.
 *
 * Usage:
 * ```typescript
 * @Get('/profile')
 * @UseGuards(AuthGuard)
 * async getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   console.log(user.id); // Authenticated user ID
 * }
 * ```
 *
 * Returns the user object attached by SessionValidationMiddleware.
 * Null/undefined if not authenticated.
 */
export interface CurrentUserPayload {
  id: string;
  customerAccount?: any;
  merchantAccount?: any;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserPayload | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as CurrentUserPayload | undefined || null;
  },
);
