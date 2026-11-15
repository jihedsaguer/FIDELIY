import { Controller, Post, Get, All, Body, Req, Res, BadRequestException } from "@nestjs/common";
import { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { toNodeHandler } from "better-auth/node";
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
@Controller("auth")
export class AuthHandler {
  constructor(
    private authService: AuthService,
    private phoneAuthService: PhoneAuthService,
    private rateLimitService: RateLimitService,
  ) {}

  @Post("phone/sign-in")
  async phoneSignIn(
    @Req() req: Request,
    @Body() dto: PhoneSignInDto,
    @Res() res: Response,
  ): Promise<void> {
    const ip = req.ip || "unknown";

    try {
      // Normalize and validate phone
      const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
      if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
        this.logSignInAttempt(ip, "invalid", "invalid_format");
        throw new BadRequestException("Invalid phone number. Use 8-digit format: XXXXXXXX");
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
      const signedToken = await new SignJWT({ jti: result.session.token })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)) // 7 days
        .sign(new TextEncoder().encode(secret));
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
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
    } catch (error) {
      console.error("Phone sign-in error:", error);
      this.logSignInAttempt(ip, "***", "error");

      if (res.headersSent) return;

      if (error instanceof BadRequestException) {
        res.status(400).json({ error: error.message });
      } else {
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
  @Post('sign-out')
  async signOut(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
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
            const { jwtVerify } = await import('jose');
            const { payload } = await jwtVerify(signedSessionToken, new TextEncoder().encode(secret));
            const sessionToken = payload.jti as string;
            
            if (sessionToken) {
              const connection = await pool.connect();
              try {
                const result = await connection.query(
                  'SELECT user_id FROM sessions WHERE token = $1',
                  [sessionToken]
                );
                if (result.rows.length > 0) {
                  userId = result.rows[0].user_id;
                }
              } finally {
                connection.release();
              }
            }
          } catch (jwtError) {
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
        } finally {
          connection.release();
        }
      }
      
      // Clear all session cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      
      res.clearCookie('session_token', cookieOptions);
      res.clearCookie('better-auth.session_token', cookieOptions);
      
      // Forward to Better Auth's sign-out handler to ensure proper cleanup
      // This handles Better Auth's internal session management
      await toNodeHandler(auth)(req, res);
      
      // If Better Auth already sent a response, we're done
      if (res.headersSent) {
        return;
      }
      
      // If we get here, Better Auth didn't send a response, so we do
      res.json({ success: true });
    } catch (error) {
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
  @Get('get-session')
  async getSession(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
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
        const { payload } = await jwtVerify(signedSessionToken, new TextEncoder().encode(secret));
        const sessionToken = payload.jti as string;
        
        if (sessionToken) {
          // Look up the session in our database
          const pool = this.authService.getPool();
          const connection = await pool.connect();
          try {
            const sessionResult = await connection.query(
              'SELECT * FROM sessions WHERE token = $1',
              [sessionToken],
            );
          
          if (sessionResult.rows.length > 0) {
            const session = sessionResult.rows[0];
            
            // Get the user
            const userResult = await connection.query(
              'SELECT id, email, name, phone_number as phoneNumber, email_verified as emailVerified, phone_number_verified as phoneNumberVerified FROM users WHERE id = $1',
              [session.user_id],
            );
            
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
        } finally {
          connection.release();
        }
      }
      }
      
      // No session found
      res.json({ session: null, user: null });
    } catch (error) {
      console.error("Get session error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to get session" });
      }
    }
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
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
  @All('*')
  async handleBetterAuth(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Skip routes handled explicitly
    if (req.method === 'GET' && req.path === '/auth/get-session') {
      return;
    }
    if (req.method === 'POST' && req.path === '/auth/sign-out') {
      return;
    }
    
    try {
      const auth = this.authService.getBetterAuth();
      await toNodeHandler(auth)(req, res);
    } catch (error) {
      console.error("Better Auth handler error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Authentication service error" });
      }
    }
  }

  private logSignInAttempt(
    ip: string,
    phonePrefix: string,
    outcome: "success" | "invalid_format" | "rate_limited" | "error",
  ): void {
    const timestamp = new Date().toISOString();
    console.log(
      JSON.stringify({
        event: "customer_phone_sign_in",
        timestamp,
        ip,
        phonePrefix,
        outcome,
      }),
    );
  }
}