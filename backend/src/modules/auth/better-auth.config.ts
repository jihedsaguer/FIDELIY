import { betterAuth } from 'better-auth';
import { phoneNumber } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

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
 * Development behavior: Logs OTP codes to console (visible in dev server output).
 * Production: Will use real SMS provider via environment configuration.
 */
async function mockSendOTP({
  phoneNumber,
  code,
}: {
  phoneNumber: string;
  code: string;
}) {
  console.log(
    `📱 [DEV] OTP Code: ${code} sent to ${phoneNumber}`,
  );
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
    // Database configuration
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true, // Our schema uses plural table names (users, accounts, etc.)
      schema: {
        user: { modelName: 'user', tableName: 'users' },
        session: { modelName: 'session', tableName: 'sessions' },
        account: { modelName: 'account', tableName: 'accounts' },
        verification: { modelName: 'verification', tableName: 'verifications' },
      },
    }),

    // Authentication secret (required; must be set via environment variable)
    secret: process.env.BETTER_AUTH_SECRET!,

    // Base URL for authentication callbacks (required for production, optional for local dev)
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3000}`,

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
    ],

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
    },
    
    // Verification model configuration (singular; adapter pluralizes when usePlural=true)
    verification: {
      modelName: 'verification',
    },

    // Advanced options
    advanced: {
      database: {
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

    // Rate limiting (basic)
    rateLimit: {
      enabled: true,
      window: 15 * 60 * 1000, // 15 minutes
      max: 100, // Max requests per window
    },
  });
}
