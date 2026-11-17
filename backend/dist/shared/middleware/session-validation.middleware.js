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
var SessionValidationMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionValidationMiddleware = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../../features/auth/auth.service");
const session_service_1 = require("../../features/auth/session.service");
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
let SessionValidationMiddleware = SessionValidationMiddleware_1 = class SessionValidationMiddleware {
    constructor(authService, sessionService) {
        this.authService = authService;
        this.sessionService = sessionService;
        this.logger = new common_1.Logger(SessionValidationMiddleware_1.name);
    }
    async use(request, response, next) {
        try {
            const cookieHeader = this.sessionService.extractCookieHeader(request);
            if (!cookieHeader) {
                // No session found; proceed without authentication
                // Guards will reject if endpoint requires auth
                return next();
            }
            // Validate session token with Better Auth API
            const validationResult = await this.authService.validateSession(cookieHeader);
            if (validationResult && validationResult.userId) {
                const userId = validationResult.userId;
                // Attach authenticated user to request
                // This is used by @CurrentUser() decorator and guards
                // userId originated from server-side session validation, trusted
                request.user = { id: userId };
            }
            else if (validationResult && validationResult.error) {
                // Session validation failed with known error type
                this.logger.debug(`Session validation failed: ${validationResult.error} (userId attempt: ${validationResult.attemptedUserId || 'N/A'})`);
                // Continue without user; guards will reject
            }
            else {
                // Unexpected error or no session
                this.logger.debug('Session validation returned no result');
            }
        }
        catch (error) {
            // Unexpected error during validation
            if (error instanceof Error) {
                this.logger.error(`Session validation middleware error: ${error.message}`);
            }
            else {
                this.logger.error('Session validation middleware failed with unknown error');
            }
            // Continue even if validation fails
            // Endpoints with guards will reject unauthenticated requests
        }
        next();
    }
};
exports.SessionValidationMiddleware = SessionValidationMiddleware;
exports.SessionValidationMiddleware = SessionValidationMiddleware = SessionValidationMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        session_service_1.SessionService])
], SessionValidationMiddleware);
//# sourceMappingURL=session-validation.middleware.js.map