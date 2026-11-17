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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const database_service_1 = require("../../database/database.service");
const session_service_1 = require("./session.service");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const better_auth_config_1 = require("./better-auth.config");
let AuthService = class AuthService {
    constructor(databaseService, sessionService, tenantContextService) {
        this.databaseService = databaseService;
        this.sessionService = sessionService;
        this.tenantContextService = tenantContextService;
    }
    validateProductionSecret() {
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.BETTER_AUTH_SECRET) {
                throw new Error('BETTER_AUTH_SECRET environment variable is required in production.');
            }
        }
    }
    async onModuleInit() {
        try {
            this.validateProductionSecret();
            (0, better_auth_config_1.validateSMSProviderForProduction)();
            this.betterAuthInstance = (0, better_auth_config_1.initializeBetterAuth)(this.databaseService.getDb());
            console.log('🔐 Better Auth initialized with phone + email/password plugins');
        }
        catch (error) {
            console.error('❌ Failed to initialize Better Auth:', error);
            throw error;
        }
    }
    getBetterAuth() {
        if (!this.betterAuthInstance) {
            throw new Error('Better Auth not initialized. Application startup failed.');
        }
        return this.betterAuthInstance;
    }
    getPool() {
        return this.databaseService.getPool();
    }
    async validateSession(cookieHeader) {
        if (!cookieHeader) {
            return { error: 'NO_TOKEN' };
        }
        let betterAuthSession = null;
        let betterAuthError = null;
        try {
            const auth = this.getBetterAuth();
            betterAuthSession = await auth.api.getSession({
                headers: { cookie: cookieHeader },
            });
        }
        catch (error) {
            betterAuthError = error instanceof Error ? error : new Error(String(error));
        }
        // If Better Auth found a session, return it
        if (betterAuthSession?.user?.id) {
            return { userId: betterAuthSession.user.id };
        }
        // If Better Auth doesn't find a session or throws an error,
        // check for phone-authenticated session
        const cookies = this.parseCookies(cookieHeader);
        const signedSessionToken = cookies['session_token'];
        if (signedSessionToken) {
            try {
                const { jwtVerify } = await Promise.resolve().then(() => __importStar(require('jose')));
                const auth = this.getBetterAuth();
                const secret = auth.options.secret;
                const { payload } = await jwtVerify(signedSessionToken, new TextEncoder().encode(secret));
                const sessionToken = payload.jti;
                if (sessionToken) {
                    // Look up the session in our database
                    const pool = this.getPool();
                    const connection = await pool.connect();
                    try {
                        const sessionResult = await connection.query('SELECT * FROM sessions WHERE token = $1', [sessionToken]);
                        if (sessionResult.rows.length > 0) {
                            const session = sessionResult.rows[0];
                            // Check if session is expired
                            if (new Date(session.expires_at) < new Date()) {
                                return { error: 'SESSION_EXPIRED', attemptedUserId: session.user_id };
                            }
                            return { userId: session.user_id };
                        }
                    }
                    finally {
                        connection.release();
                    }
                }
            }
            catch (jwtError) {
                // JWT verification failed - could be invalid or expired
                if (jwtError instanceof Error) {
                    const message = jwtError.message.toLowerCase();
                    if (message.includes('expired')) {
                        return { error: 'SESSION_EXPIRED' };
                    }
                }
                // Continue to check Better Auth error below
            }
        }
        // If Better Auth threw an error, check if it was a known error
        if (betterAuthError) {
            const message = betterAuthError.message.toLowerCase();
            if (message.includes('econnrefused') ||
                message.includes('enotfound') ||
                message.includes('timeout')) {
                return { error: 'DATABASE_ERROR', attemptedUserId: undefined };
            }
            if (message.includes('expired')) {
                return { error: 'SESSION_EXPIRED' };
            }
        }
        return { error: 'INVALID_SESSION' };
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
    async getCurrentUser(cookieHeader) {
        try {
            const auth = this.getBetterAuth();
            const session = await auth.api.getSession({
                headers: { cookie: cookieHeader },
            });
            return session?.user || null;
        }
        catch {
            return null;
        }
    }
    async verifyPhoneOTP(phoneNumber, code) {
        try {
            const auth = this.getBetterAuth();
            return await auth.api.phoneNumber.verify({
                body: {
                    phoneNumber,
                    code,
                },
            });
        }
        catch (error) {
            console.warn('Phone OTP verification failed:', error);
            return null;
        }
    }
    async sendPhoneOTP(phoneNumber) {
        try {
            const auth = this.getBetterAuth();
            return await auth.api.phoneNumber.sendVerificationCode({
                body: {
                    phoneNumber,
                },
            });
        }
        catch (error) {
            console.warn('Phone OTP send failed:', error);
            return null;
        }
    }
    async phoneSignIn(normalizedPhone) {
        const pool = this.databaseService.getPool();
        let connection = null;
        try {
            connection = await pool.connect();
            await connection.query('BEGIN ISOLATION LEVEL READ COMMITTED');
            const existingUsersResult = await connection.query('SELECT id FROM users WHERE phone_number = $1', [normalizedPhone]);
            let userId;
            if (existingUsersResult.rows.length > 0) {
                userId = existingUsersResult.rows[0].id;
                console.log(`[PhoneSignIn] Existing customer: ${userId.substring(0, 8)}...`);
            }
            else {
                const tempEmail = `${normalizedPhone}@fideliy.local`;
                const tempName = normalizedPhone;
                const createUserResult = await connection.query(`INSERT INTO users 
             (email, name, phone_number, phone_number_verified, email_verified, created_at, updated_at)
           VALUES 
             ($1, $2, $3, false, false, now(), now())
           RETURNING id`, [tempEmail, tempName, normalizedPhone]);
                userId = createUserResult.rows[0].id;
                console.log(`[PhoneSignIn] Created new customer: ${userId.substring(0, 8)}...`);
            }
            await connection.query(`INSERT INTO customer_accounts 
           (user_id, phone_number, phone_verified, created_at, updated_at, joined_at)
         VALUES 
           ($1, $2, false, now(), now(), now())
         ON CONFLICT (user_id) DO NOTHING`, [userId, normalizedPhone]);
            // Create session directly in database
            // Better Auth expects sessions in its format
            const sessionId = crypto.randomUUID();
            const sessionToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await connection.query(`INSERT INTO sessions 
           (id, user_id, token, expires_at, created_at, updated_at)
         VALUES 
           ($1, $2, $3, $4, now(), now())
         RETURNING *`, [sessionId, userId, sessionToken, expiresAt]);
            await connection.query('COMMIT');
            console.log(`[PhoneSignIn] Session created: ${sessionToken.substring(0, 8)}...`);
            return {
                user: { id: userId },
                session: {
                    id: sessionId,
                    token: sessionToken,
                    expiresAt: expiresAt.toISOString(),
                    userId: userId,
                },
            };
        }
        catch (error) {
            if (connection) {
                try {
                    await connection.query('ROLLBACK');
                }
                catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                }
            }
            console.error('Phone sign-in failed:', error);
            throw error;
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        session_service_1.SessionService,
        tenant_context_service_1.TenantContextService])
], AuthService);
//# sourceMappingURL=auth.service.js.map