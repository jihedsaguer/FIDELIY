import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SessionService } from './session.service';
import { initializeBetterAuth, validateSMSProviderForProduction } from './better-auth.config';

/**
 * Phase 1B: Auth Service
 *
 * Manages Better Auth integration and session lifecycle.
 *
 * Responsibilities:
 * - Validate production configuration at startup (secret, SMS provider)
 * - Initialize Better Auth instance at application startup
 * - Provide access to Better Auth for session validation
 * - Validate sessions via Better Auth API
 * - Handle session expiration and refresh
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private betterAuthInstance: any;

  constructor(
    private databaseService: DatabaseService,
    private sessionService: SessionService,
  ) {}

  /**
   * Validate Better Auth secret is configured in production.
   * Prevents token forgery by requiring explicit secret setup.
   * 
   * @throws Error if production environment and secret not set
   */
  private validateProductionSecret(): void {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.BETTER_AUTH_SECRET) {
        throw new Error(
          'BETTER_AUTH_SECRET environment variable is required in production. ' +
          'Without it, Better Auth cannot verify session tokens and will fail to authenticate users. ' +
          'Set BETTER_AUTH_SECRET before deploying to production.'
        );
      }
    }
  }

  async onModuleInit() {
    try {
      // Stage 1 Production Safeguards:
      // 1. Validate BETTER_AUTH_SECRET is set in production
      this.validateProductionSecret();
      
      // 2. Validate SMS provider is not mock in production
      validateSMSProviderForProduction();

      // Initialize Better Auth instance with database connection
      this.betterAuthInstance = initializeBetterAuth(
        this.databaseService.getDb(),
      );
      console.log(
        '🔐 Better Auth initialized with phone + email/password plugins',
      );
    } catch (error) {
      console.error('❌ Failed to initialize Better Auth:', error);
      throw error;
    }
  }

  /**
   * Get the Better Auth instance.
   * Provides access to Better Auth API for session management and authentication.
   *
   * @returns Initialized Better Auth instance
   * @throws Error if Better Auth not initialized
   */
  getBetterAuth() {
    if (!this.betterAuthInstance) {
      throw new Error('Better Auth not initialized. Application startup failed.');
    }
    return this.betterAuthInstance;
  }

  /**
   * Validate a session token and retrieve the authenticated user.
   *
   * Uses Better Auth's session API to:
   * 1. Extract session ID from token
   * 2. Query sessions table
   * 3. Verify session expiration
   * 4. Return user ID if valid
   *
   * @param sessionToken Session token from Authorization header or cookie
   * @returns Object with userId if valid, error type if invalid
   */
  async validateSession(
    sessionToken: string,
  ): Promise<{ userId?: string; error?: string; attemptedUserId?: string } | null> {
    if (!sessionToken) {
      return { error: 'NO_TOKEN' };
    }

    try {
      // Call Better Auth's session validation API
      // This queries the sessions table and verifies the token and expiration
      const auth = this.getBetterAuth();
      const session = await auth.api.getSession({
        headers: {
          cookie: `better-auth.session_token=${sessionToken}`,
        },
      });

      // If session is valid and not expired, return user ID
      if (session?.user?.id) {
        return { userId: session.user.id };
      }

      // No valid session but no error thrown (e.g., token format valid but expired or not found)
      return { error: 'INVALID_SESSION' };
    } catch (error) {
      // Session validation failed with exception
      // Distinguish between error types for better debugging
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (
          message.includes('econnrefused') ||
          message.includes('enotfound') ||
          message.includes('timeout')
        ) {
          // Database or network error
          return { error: 'DATABASE_ERROR', attemptedUserId: undefined };
        }

        if (message.includes('expired')) {
          return { error: 'SESSION_EXPIRED' };
        }

        if (
          message.includes('invalid') ||
          message.includes('malformed') ||
          message.includes('signature')
        ) {
          return { error: 'INVALID_TOKEN' };
        }

        // Generic error
        return { error: `VALIDATION_ERROR: ${error.message}` };
      }

      // Non-Error thrown (shouldn't happen but handle gracefully)
      return { error: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get the currently authenticated user from a session token.
   *
   * @param sessionToken Session token
   * @returns User object if session is valid, null otherwise
   */
  async getCurrentUser(sessionToken: string) {
    try {
      const auth = this.getBetterAuth();
      const session = await auth.api.getSession({
        headers: {
          cookie: `better-auth.session_token=${sessionToken}`,
        },
      });

      return session?.user || null;
    } catch {
      return null;
    }
  }

  /**
   * Verify a phone number OTP code.
   * Used during customer signup/signin flow.
   *
   * @param phoneNumber Customer phone number
   * @param code OTP code sent via SMS
   * @returns Verification result or null if invalid
   */
  async verifyPhoneOTP(phoneNumber: string, code: string) {
    try {
      const auth = this.getBetterAuth();
      return await auth.api.phoneNumber.verify({
        body: {
          phoneNumber,
          code,
        },
      });
    } catch (error) {
      console.warn('Phone OTP verification failed:', error);
      return null;
    }
  }

  /**
   * Send OTP code to a phone number.
   * Used during customer signup/signin flow.
   *
   * @param phoneNumber Customer phone number
   */
  async sendPhoneOTP(phoneNumber: string) {
    try {
      const auth = this.getBetterAuth();
      return await auth.api.phoneNumber.sendVerificationCode({
        body: {
          phoneNumber,
        },
      });
    } catch (error) {
      console.warn('Failed to send phone OTP:', error);
      throw error;
    }
  }
}
