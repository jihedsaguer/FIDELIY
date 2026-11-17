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
export declare function validateSMSProviderForProduction(): void;
/**
 * Initialize Better Auth instance.
 * Called once during application startup.
 *
 * @param db Drizzle ORM database instance
 * @returns Configured Better Auth instance
 */
export declare function initializeBetterAuth(db: NodePgDatabase): any;
//# sourceMappingURL=better-auth.config.d.ts.map