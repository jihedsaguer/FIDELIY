import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { PhoneAuthService } from "./phone-auth.service";
import { RateLimitService } from "../../shared/security/rate-limit.service";
import { PhoneSignInDto } from "./dto/phone-sign-in.dto";
/**
 * Auth Handler - Request/Response Controller
 *
 * Responsibilities:
 * - Validate phone number format and normalize
 * - Apply rate limiting per IP
 * - Call AuthService.phoneSignIn()
 * - Forward Better Auth session handling to toNodeHandler (which manages cookies)
 *
 * Phone Sign-In Endpoint: POST /auth/phone/sign-in
 * - Input: { phoneNumber: string }
 * - Processing:
 *   1. Normalize phone (strip spaces, validate format)
 *   2. Check rate limit (10 attempts / 10 min per IP)
 *   3. Call AuthService.phoneSignIn(normalizedPhone)
 *   4. Forward session to caller (Better Auth manages cookie)
 * - Success: 200 { user: { id }, session: { token, expiresAt } }
 * - Error: 400 (invalid), 429 (rate limited), 500 (server error)
 */
export declare class AuthHandler {
    private authService;
    private phoneAuthService;
    private rateLimitService;
    constructor(authService: AuthService, phoneAuthService: PhoneAuthService, rateLimitService: RateLimitService);
    phoneSignIn(req: Request, dto: PhoneSignInDto, res: Response): Promise<void>;
    /**
     * Sign out - Clear all sessions for the user.
     * This handles POST /auth/sign-out for all session types (Better Auth and phone auth).
     *
     * Strategy:
     * 1. Get user ID from session (via SessionValidationMiddleware)
     * 2. Delete ALL sessions for this user from the database
     * 3. Clear all session cookies
     * 4. Forward to Better Auth's sign-out to ensure its cleanup runs
     */
    signOut(req: Request, res: Response): Promise<void>;
    /**
     * Get current session - Custom implementation for phone-authenticated users
     * This handles /auth/get-session to support both Better Auth sessions and
     * our manually-created phone sign-in sessions.
     */
    getSession(req: Request, res: Response): Promise<void>;
    private parseCookies;
    /**
     * Forward all other Better Auth requests to the main handler.
     * This handles /auth/* endpoints managed by Better Auth:
     * - /auth/sign-in/email
     * - /auth/sign-up/email
     * - /auth/phone-number/send-otp
     * - /auth/phone-number/verify
     * - etc.
     *
     * Note: /auth/sign-out and /auth/get-session are handled explicitly above.
     *
     * toNodeHandler manages:
     * - Session cookies (create, validate, expire)
     * - CSRF protection
     * - Email verification flows
     * - OTP flows
     */
    handleBetterAuth(req: Request, res: Response): Promise<void>;
    private logSignInAttempt;
}
//# sourceMappingURL=auth.handler.d.ts.map