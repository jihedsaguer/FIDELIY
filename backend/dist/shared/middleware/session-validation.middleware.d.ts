import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../features/auth/auth.service';
import { SessionService } from '../../features/auth/session.service';
/**
 * Phase 1B (Corrected): Session Validation Middleware
 *
 * Validates Better Auth session and establishes authenticated principal.
 * Does NOT acquire or hold database connections.
 *
 * Flow:
 * 1. Pass the complete Cookie header to Better Auth for signed-cookie validation
 * 2. Validate token with Better Auth API (uses pool connection, released immediately)
 * 3. Attach authenticated user to request
 * 4. Pass to next middleware (guard or controller)
 *
 * If no session or invalid session:
 * - request.user remains undefined
 * - Endpoints with @UseGuards will reject with 401 Unauthorized
 *
 * Public endpoints (no guards) can still be accessed without session.
 *
 * Security:
 * - Never logs session tokens, cookies, or other secrets
 * - userId originates exclusively from server-side session validation
 * - No connection held; no RLS context set here (guards and services set context per-operation)
 */
export declare class SessionValidationMiddleware implements NestMiddleware {
    private authService;
    private sessionService;
    private readonly logger;
    constructor(authService: AuthService, sessionService: SessionService);
    use(request: Request, response: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=session-validation.middleware.d.ts.map