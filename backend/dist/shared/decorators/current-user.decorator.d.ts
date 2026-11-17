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
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
//# sourceMappingURL=current-user.decorator.d.ts.map