"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHandler = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const node_1 = require("better-auth/node");
const auth_service_1 = require("./auth.service");
const phone_auth_service_1 = require("./phone-auth.service");
const rate_limit_service_1 = require("../../shared/security/rate-limit.service");
const phone_sign_in_dto_1 = require("./dto/phone-sign-in.dto");
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
let AuthHandler = class AuthHandler {
    constructor(authService, phoneAuthService, rateLimitService) {
        this.authService = authService;
        this.phoneAuthService = phoneAuthService;
        this.rateLimitService = rateLimitService;
    }
    async phoneSignIn(req, dto, res) {
        const ip = req.ip || "unknown";
        try {
            // Normalize and validate phone
            const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
            if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
                this.logSignInAttempt(ip, "invalid", "invalid_format");
                throw new common_1.BadRequestException("Invalid phone number. Use 8-digit format: XXXXXXXX");
            }
            // Rate limit check
            const limit = this.rateLimitService.check(ip);
            if (!limit.allowed) {
                const prefix = this.phoneAuthService.getPhonePrefix(normalized);
                this.logSignInAttempt(ip, prefix, "rate_limited");
                res.status(429).json({ error: "Too many sign-in attempts. Try again later." });
                return;
            }
            // Phone sign-in: create/load user and customer account
            const result = await this.authService.phoneSignIn(normalized);
            // Log success
            const prefix = this.phoneAuthService.getPhonePrefix(normalized);
            this.logSignInAttempt(ip, prefix, "success");
            // Set session cookie for Better Auth compatibility
            // Sign the session token with Better Auth secret so it can be validated
            // Wrap token in JWT payload with jti (JWT ID) field
            const auth = this.authService.getBetterAuth();
            const secret = auth.options.secret;
            const signedToken = await new jose_1.SignJWT({ jti: result.session.token })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)) // 7 days
                .sign(new TextEncoder().encode(secret));
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            };
            // Set the signed session token as a cookie
            // Use the same cookie name that Better Auth expects: "session_token"
            res.cookie('session_token', signedToken, cookieOptions);
            // Return user and session
            res.json({
                user: result.user,
                session: result.session,
            });
        }
        catch (error) {
            console.error("Phone sign-in error:", error);
            this.logSignInAttempt(ip, "***", "error");
            if (res.headersSent)
                return;
            if (error instanceof common_1.BadRequestException) {
                res.status(400).json({ error: error.message });
            }
            else {
                // In development, return the actual error for debugging
                const errorMessage = process.env.NODE_ENV === 'development'
                    ? (error instanceof Error ? error.message : String(error))
                    : "Authentication service error";
                res.status(500).json({ error: errorMessage });
            }
        }
    }
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
    async signOut(req, res) {
        try {
            const auth = this.authService.getBetterAuth();
            const pool = this.authService.getPool();
            // Get the user ID from the session (set by SessionValidationMiddleware)
            let userId = req.user?.id;
            // If no user in request, try to get it from phone session cookie
            if (!userId) {
                const cookies = req.headers.cookie ? this.parseCookies(req.headers.cookie) : {};
                const signedSessionToken = cookies['session_token'];
                if (signedSessionToken) {
                    try {
                        const auth = this.authService.getBetterAuth();
                        const secret = auth.options.secret;
                        const { jwtVerify } = await Promise.resolve().then(() => __importStar(require('jose')));
                        const { payload } = await jwtVerify(signedSessionToken, new TextEncoder().encode(secret));
                        const sessionToken = payload.jti;
                        if (sessionToken) {
                            const connection = await pool.connect();
                            try {
                                const result = await connection.query('SELECT user_id FROM sessions WHERE token = $1', [sessionToken]);
                                if (result.rows.length > 0) {
                                    userId = result.rows[0].user_id;
                                }
                            }
                            finally {
                                connection.release();
                            }
                        }
                    }
                    catch (jwtError) {
                        console.warn('[SignOut] Could not parse phone session token:', jwtError);
                    }
                }
            }
            // Delete ALL sessions for this user from the database
            // This handles both Better Auth sessions and phone-authenticated sessions
            if (userId) {
                const connection = await pool.connect();
                try {
                    await connection.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
                    console.log(`[SignOut] Deleted all sessions for user: ${userId.substring(0, 8)}...`);
                }
                finally {
                    connection.release();
                }
            }
            // Clear all session cookies
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            };
            res.clearCookie('session_token', cookieOptions);
            res.clearCookie('better-auth.session_token', cookieOptions);
            // Forward to Better Auth's sign-out handler to ensure proper cleanup
            // This handles Better Auth's internal session management
            await (0, node_1.toNodeHandler)(auth)(req, res);
            // If Better Auth already sent a response, we're done
            if (res.headersSent) {
                return;
            }
            // If we get here, Better Auth didn't send a response, so we do
            res.json({ success: true });
        }
        catch (error) {
            console.error('Sign-out error:', error);
            if (!res.headersSent) {
                res.json({ success: true });
            }
        }
    }
    /**
     * Get current session - Custom implementation for phone-authenticated users
     * This handles /auth/get-session to support both Better Auth sessions and
     * our manually-created phone sign-in sessions.
     */
    async getSession(req, res) {
        try {
            const auth = this.authService.getBetterAuth();
            // First, try Better Auth's native session resolution
            // This will check for Better Auth's signed cookies
            const baSession = await auth.api.getSession({
                headers: { cookie: req.headers.cookie || '' },
            });
            if (baSession?.user) {
                res.json({ session: baSession, user: baSession.user });
                return;
            }
            // If Better Auth doesn't find a session, check for our phone sign-in session cookie
            // Parse the session_token cookie from the request
            const cookies = req.headers.cookie ? this.parseCookies(req.headers.cookie) : {};
            const signedSessionToken = cookies['session_token'];
            if (signedSessionToken) {
                // The cookie is a JWT signed with Better Auth secret
                // Decode it to get the actual session token (stored in jti field)
                const auth = this.authService.getBetterAuth();
                const secret = auth.options.secret;
                const { payload } = await (0, jose_1.jwtVerify)(signedSessionToken, new TextEncoder().encode(secret));
                const sessionToken = payload.jti;
                if (sessionToken) {
                    // Look up the session in our database
                    const pool = this.authService.getPool();
                    const connection = await pool.connect();
                    try {
                        const sessionResult = await connection.query('SELECT * FROM sessions WHERE token = $1', [sessionToken]);
                        if (sessionResult.rows.length > 0) {
                            const session = sessionResult.rows[0];
                            // Get the user
                            const userResult = await connection.query('SELECT id, email, name, phone_number as phoneNumber, email_verified as emailVerified, phone_number_verified as phoneNumberVerified FROM users WHERE id = $1', [session.user_id]);
                            if (userResult.rows.length > 0) {
                                const user = userResult.rows[0];
                                res.json({
                                    session: {
                                        id: session.id,
                                        token: session.token,
                                        expiresAt: session.expires_at,
                                        userId: session.user_id,
                                    },
                                    user: {
                                        id: user.id,
                                        email: user.email,
                                        name: user.name,
                                        phoneNumber: user.phoneNumber,
                                        emailVerified: user.emailVerified,
                                        phoneNumberVerified: user.phoneNumberVerified,
                                    },
                                });
                                return;
                            }
                        }
                    }
                    finally {
                        connection.release();
                    }
                }
            }
            // No session found
            res.json({ session: null, user: null });
        }
        catch (error) {
            console.error("Get session error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to get session" });
            }
        }
    }
    parseCookies(cookieHeader) {
        const cookies = {};
        const pairs = cookieHeader.split(';');
        for (const pair of pairs) {
            const [name, ...rest] = pair.trim().split('=');
            if (name && rest.length > 0) {
                cookies[name] = rest.join('=');
            }
        }
        return cookies;
    }
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
    async handleBetterAuth(req, res) {
        // Skip routes handled explicitly
        if (req.method === 'GET' && req.path === '/auth/get-session') {
            return;
        }
        if (req.method === 'POST' && req.path === '/auth/sign-out') {
            return;
        }
        try {
            const auth = this.authService.getBetterAuth();
            await (0, node_1.toNodeHandler)(auth)(req, res);
        }
        catch (error) {
            console.error("Better Auth handler error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Authentication service error" });
            }
        }
    }
    logSignInAttempt(ip, phonePrefix, outcome) {
        const timestamp = new Date().toISOString();
        console.log(JSON.stringify({
            event: "customer_phone_sign_in",
            timestamp,
            ip,
            phonePrefix,
            outcome,
        }));
    }
};
exports.AuthHandler = AuthHandler;
__decorate([
    (0, common_1.Post)("phone/sign-in"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, phone_sign_in_dto_1.PhoneSignInDto, Object]),
    __metadata("design:returntype", Promise)
], AuthHandler.prototype, "phoneSignIn", null);
__decorate([
    (0, common_1.Post)('sign-out'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthHandler.prototype, "signOut", null);
__decorate([
    (0, common_1.Get)('get-session'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthHandler.prototype, "getSession", null);
__decorate([
    (0, common_1.All)('*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthHandler.prototype, "handleBetterAuth", null);
exports.AuthHandler = AuthHandler = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        phone_auth_service_1.PhoneAuthService,
        rate_limit_service_1.RateLimitService])
], AuthHandler);
//# sourceMappingURL=auth.handler.js.map