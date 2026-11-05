import { Controller, All, Req, Res, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

/**
 * Phase 1B: Better Auth Handler Controller
 *
 * Mounts Better Auth HTTP endpoints.
 * All authentication endpoints go through this controller:
 * - /auth/* — All Better Auth routes
 *
 * Better Auth provides:
 * - /auth/sign-up — Create new account
 * - /auth/sign-in — Authenticate user
 * - /auth/sign-out — End session
 * - /auth/session — Get current session
 * - /auth/send-verification-code — Send OTP (phone)
 * - /auth/verify-phone-number — Verify OTP (phone)
 * - And many more...
 *
 * This controller forwards all requests to Better Auth's handler.
 */
@Controller('auth')
export class AuthHandler {
  constructor(private authService: AuthService) {}

  /**
   * Forward all requests to Better Auth handler.
   * @param req Express request
   * @param res Express response
   * @param route Remaining route path after /auth
   */
  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Param() params: Record<string, any>,
  ) {
    try {
      const auth = this.authService.getBetterAuth();

      // Better Auth's handler needs a full URL, not just the path
      // Express Request.url contains just the path in a NestJS context
      // We need to construct: http://localhost:3000/auth/...
      const protocol = req.protocol || (process.env.BETTER_AUTH_URL?.startsWith('https') ? 'https' : 'http');
      const host = req.get('host') || 'localhost:3000';
      const path = req.originalUrl || `/auth/${params['0'] || ''}`;
      
      req.url = new URL(path, `${protocol}://${host}`).href;

      // Call Better Auth handler with the request and response
      await auth.handler(req, res);
    } catch (error) {
      console.error('Auth handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Authentication service error' });
      }
    }
  }
}
