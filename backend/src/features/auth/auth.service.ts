import { Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { SessionService } from './session.service';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { users, sessions } from '../../database/schema';
import { customerAccounts } from '../customers/schemas';
import { initializeBetterAuth, validateSMSProviderForProduction } from './better-auth.config';

@Injectable()
export class AuthService implements OnModuleInit {
  private betterAuthInstance: any;

  constructor(
    private databaseService: DatabaseService,
    private sessionService: SessionService,
    private tenantContextService: TenantContextService,
  ) {}

  private validateProductionSecret(): void {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.BETTER_AUTH_SECRET) {
        throw new Error(
          'BETTER_AUTH_SECRET environment variable is required in production.'
        );
      }
    }
  }

  async onModuleInit() {
    try {
      this.validateProductionSecret();
      validateSMSProviderForProduction();
      this.betterAuthInstance = initializeBetterAuth(
        this.databaseService.getDb(),
      );
      console.log('🔐 Better Auth initialized with phone + email/password plugins');
    } catch (error) {
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

  async validateSession(
    cookieHeader: string,
  ): Promise<{ userId?: string; error?: string; attemptedUserId?: string } | null> {
    if (!cookieHeader) {
      return { error: 'NO_TOKEN' };
    }
    
    let betterAuthSession: any = null;
    let betterAuthError: Error | null = null;
    
    try {
      const auth = this.getBetterAuth();
      betterAuthSession = await auth.api.getSession({
        headers: { cookie: cookieHeader },
      });
    } catch (error) {
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
        const { jwtVerify } = await import('jose');
        const auth = this.getBetterAuth();
        const secret = auth.options.secret;
        const { payload } = await jwtVerify(signedSessionToken, new TextEncoder().encode(secret));
        const sessionToken = payload.jti as string;
        
        if (sessionToken) {
          // Look up the session in our database
          const pool = this.getPool();
          const connection = await pool.connect();
          try {
            const sessionResult = await connection.query(
              'SELECT * FROM sessions WHERE token = $1',
              [sessionToken],
            );
            
            if (sessionResult.rows.length > 0) {
              const session = sessionResult.rows[0];
              // Check if session is expired
              if (new Date(session.expires_at) < new Date()) {
                return { error: 'SESSION_EXPIRED', attemptedUserId: session.user_id };
              }
              return { userId: session.user_id };
            }
          } finally {
            connection.release();
          }
        }
      } catch (jwtError) {
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
      if (
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('timeout')
      ) {
        return { error: 'DATABASE_ERROR', attemptedUserId: undefined };
      }
      if (message.includes('expired')) {
        return { error: 'SESSION_EXPIRED' };
      }
    }
    
    return { error: 'INVALID_SESSION' };
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

  async getCurrentUser(cookieHeader: string) {
    try {
      const auth = this.getBetterAuth();
      const session = await auth.api.getSession({
        headers: { cookie: cookieHeader },
      });
      return session?.user || null;
    } catch {
      return null;
    }
  }

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

  async sendPhoneOTP(phoneNumber: string) {
    try {
      const auth = this.getBetterAuth();
      return await auth.api.phoneNumber.sendVerificationCode({
        body: {
          phoneNumber,
        },
      });
    } catch (error) {
      console.warn('Phone OTP send failed:', error);
      return null;
    }
  }

  async phoneSignIn(normalizedPhone: string) {
    const pool = this.databaseService.getPool();
    let connection = null;

    try {
      connection = await pool.connect();
      await connection.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      
      const existingUsersResult = await connection.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [normalizedPhone],
      );

      let userId: string;

      if (existingUsersResult.rows.length > 0) {
        userId = existingUsersResult.rows[0].id;
        console.log(`[PhoneSignIn] Existing customer: ${userId.substring(0, 8)}...`);
      } else {
        const tempEmail = `${normalizedPhone}@fideliy.local`;
        const tempName = normalizedPhone;

        const createUserResult = await connection.query(
          `INSERT INTO users 
             (email, name, phone_number, phone_number_verified, email_verified, created_at, updated_at)
           VALUES 
             ($1, $2, $3, false, false, now(), now())
           RETURNING id`,
          [tempEmail, tempName, normalizedPhone],
        );

        userId = createUserResult.rows[0].id;
        console.log(`[PhoneSignIn] Created new customer: ${userId.substring(0, 8)}...`);
      }

      await connection.query(
        `INSERT INTO customer_accounts 
           (user_id, phone_number, phone_verified, created_at, updated_at, joined_at)
         VALUES 
           ($1, $2, false, now(), now(), now())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, normalizedPhone],
      );

      // Create session directly in database
      // Better Auth expects sessions in its format
      const sessionId = crypto.randomUUID();
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await connection.query(
        `INSERT INTO sessions 
           (id, user_id, token, expires_at, created_at, updated_at)
         VALUES 
           ($1, $2, $3, $4, now(), now())
         RETURNING *`,
        [sessionId, userId, sessionToken, expiresAt],
      );

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
    } catch (error) {
      if (connection) {
        try {
          await connection.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      console.error('Phone sign-in failed:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}