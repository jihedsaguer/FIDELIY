import { betterAuth } from 'better-auth';
import { phoneNumber, testUtils } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as databaseSchema from '../../database/schema';
import { accounts, sessions, users, verifications } from '../../database/schema';

const adapterSchema = {
  ...databaseSchema,
  user: users,
  account: accounts,
  session: sessions,
  verification: verifications,
};

/**
 * Phase 1B: Better Auth Configuration
 *
 * Creates and exports a configured Better Auth instance with:
 * - Phone Number plugin for customer OTP authentication
 * - Email/password provider for merchant authentication
 * - Drizzle ORM adapter for PostgreSQL
 * - Mock SMS provider for development (actual SMS vendor pending)
 *
 * This is the canonical authentication instance for the application.
 * Used for:
 * - Session validation
 * - OTP verification
 * - Email verification
 * - Account linking
 */

/**
 * Validate SMS provider configuration for production safety.
 * 
 * In production:
 * - Must NOT use mock SMS provider (prevents OTP logging, ensures real SMS delivery)
 * - Must have actual SMS vendor configured (pending Twilio/Vonage/etc. selection)
 * 
 * Fails startup if misconfigured.
 * 
 * @throws Error if production SMS provider is mock or unconfigured
 */
export function validateSMSProviderForProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    const smsProvider = process.env.SMS_PROVIDER || 'mock';
    
    if (smsProvider === 'mock') {
      throw new Error(
        'SMS_PROVIDER=mock is not allowed in production. ' +
        'OTP codes must be sent via real SMS vendor (Twilio, Vonage, etc.). ' +
        'Set SMS_PROVIDER environment variable to actual vendor before deploying.'
      );
    }

    // Future: validate that actual vendor credentials are present
    // if (!process.env.SMS_VENDOR_API_KEY) {
    //   throw new Error('SMS_VENDOR_API_KEY required in production');
    // }
  }
}

/**
 * Mock SMS provider for development.
 * In production, this will be replaced with actual SMS vendor (Twilio, Vonage, etc.)
 *
 * Development behavior: the local provider is a no-op; Better Auth retains
 * the verification value in its database for the configured OTP lifetime.
 * Production: Will use real SMS provider via environment configuration.
 */
async function mockSendOTP(_data: {
  phoneNumber: string;
  code: string;
}) {
  // In production: await smsProvider.send({ to: phoneNumber, message: `Your code: ${code}` })
}

/**
 * Initialize Better Auth instance.
 * Called once during application startup.
 *
 * @param db Drizzle ORM database instance
 * @returns Configured Better Auth instance
 */
export function initializeBetterAuth(db: NodePgDatabase): any {
  return betterAuth({
    basePath: '/api/auth',

    // Database configuration
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true, // Our schema uses plural table names (users, accounts, etc.)
      schema: adapterSchema,
    }),

    // Authentication secret (required; must be set via environment variable)
    secret: process.env.BETTER_AUTH_SECRET!,

    // Base URL for authentication callbacks (required for production, optional for local dev)
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3000}`,
    trustedOrigins: [
      process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3000}`,
      process.env.FRONTEND_URL || 'http://localhost:5173',
    ],

    // Email configuration (for merchant password resets, etc.)
    emailAndPassword: {
      enabled: true,
    },

    // Phone Number plugin for customer authentication
    plugins: [
      phoneNumber({
        // Send OTP via SMS
        sendOTP: mockSendOTP,

        // Allow sign-up with phone number
        signUpOnVerification: {
          getTempEmail: (phoneNumber: string) => `${phoneNumber}@fideliy.local`,
          getTempName: (phoneNumber: string) => phoneNumber,
        },
      }),
      ...(process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID
        ? [testUtils({ captureOTP: true })]
        : []),
    ],

    databaseHooks: {
      verification: {
        create: {
          before: async (verification) => {
            if (verification.identifier.startsWith('phone-number-otp-')) {
              await db
                .delete(verifications)
                .where(eq(verifications.identifier, verification.identifier));
            }
          },
        },
      },
    },

    // User model configuration (singular; adapter pluralizes when usePlural=true)
    user: {
      modelName: 'user',
    },
    
    // Session model configuration (singular; adapter pluralizes when usePlural=true)
    session: {
      modelName: 'session',
    },
    
    // Account model configuration (singular; adapter pluralizes when usePlural=true)
    account: {
      modelName: 'account',
      fields: {
        accountId: 'providerAccountId',
        providerId: 'provider',
      },
    },
    
    // Verification model configuration (singular; adapter pluralizes when usePlural=true)
    verification: {
      modelName: 'verification',
    },

    // Advanced options
    advanced: {
      database: {
        generateId: 'uuid',
        joins: true, // Enable joins for better query performance
        validateSchema: false, // Disable schema validation for development (schema is manually managed)
      },
    },

    // Trust proxy for session validation (important for reverse proxies)
    trustHost: true,

    // Session configuration
    sessions: {
      expiresIn: 7 * 24 * 60 * 60, // 7 days
      updateAge: 24 * 60 * 60, // Update session age every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60 * 1000, // Cache for 5 minutes
      },
    },

    // CSRF protection
    csrf: {
      enabled: true,
    },

    // Rate limiting (disabled for tests)
    rateLimit: {
      enabled: process.env.NODE_ENV !== 'test',
      window: 15 * 60 * 1000, // 15 minutes
      max: 100, // Max requests per window
    },
  });
}
