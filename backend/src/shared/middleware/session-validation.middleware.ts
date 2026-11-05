import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { SessionService } from '../../modules/auth/session.service';

/**
 * Phase 1B (Corrected): Session Validation Middleware
 *
 * Validates Better Auth session and establishes authenticated principal.
 * Does NOT acquire or hold database connections.
 *
 * Flow:
 * 1. Extract session token from Authorization header or cookie
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
@Injectable()
export class SessionValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionValidationMiddleware.name);

  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
  ) {}

  async use(request: Request, response: Response, next: NextFunction) {
    try {
      // Extract session token from request
      const sessionToken = this.sessionService.extractSessionToken(request);

      if (!sessionToken) {
        // No session found; proceed without authentication
        // Guards will reject if endpoint requires auth
        return next();
      }

      // Validate session token with Better Auth API
      const validationResult = await this.authService.validateSession(sessionToken);

      if (validationResult && validationResult.userId) {
        const userId = validationResult.userId;

        // Attach authenticated user to request
        // This is used by @CurrentUser() decorator and guards
        // userId originated from server-side session validation, trusted
        request.user = { id: userId };
      } else if (validationResult && validationResult.error) {
        // Session validation failed with known error type
        this.logger.debug(
          `Session validation failed: ${validationResult.error} (userId attempt: ${validationResult.attemptedUserId || 'N/A'})`,
        );
        // Continue without user; guards will reject
      } else {
        // Unexpected error or no session
        this.logger.debug('Session validation returned no result');
      }
    } catch (error) {
      // Unexpected error during validation
      if (error instanceof Error) {
        this.logger.error(`Session validation middleware error: ${error.message}`);
      } else {
        this.logger.error('Session validation middleware failed with unknown error');
      }
      // Continue even if validation fails
      // Endpoints with guards will reject unauthenticated requests
    }

    next();
  }
}
