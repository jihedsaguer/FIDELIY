/**
 * FIDELIY Local Test OTP Retrieval Utility
 *
 * Retrieves a previously-generated OTP code for local development testing.
 * Does NOT generate, modify, or consume OTP records.
 *
 * Usage:
 *   npm run retrieve:test-otp
 *
 * Environment (required):
 *   NODE_ENV=development
 *   ENABLE_LOCAL_TEST_AUTH=true
 *   LOCAL_TEST_PHONE_NUMBER=+216XXXXXXXXXX
 *   DATABASE_URL=postgresql://...
 *
 * Output:
 *   ✓ OTP: 123456 (expires in 4m 30s)
 *   OR
 *   ✗ No active OTP for +216XXXXXXXXXX
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import pg from 'pg';

// Reuse existing .env discovery pattern from migrate.ts
const findEnvPath = (): string | null => {
  let currentDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
};

async function retrieveLocalTestOtp(): Promise<void> {
  let pool: pg.Pool | null = null;

  try {
    // Load .env
    const envPath = findEnvPath();
    if (envPath) {
      dotenv.config({ path: envPath });
    }

    // Validate preconditions
    if (process.env.NODE_ENV !== 'development') {
      console.error(
        '❌ ENABLE_LOCAL_TEST_AUTH utility only runs in NODE_ENV=development'
      );
      process.exit(1);
    }

    if (process.env.ENABLE_LOCAL_TEST_AUTH !== 'true') {
      console.error(
        '❌ ENABLE_LOCAL_TEST_AUTH environment variable must be set to "true"'
      );
      process.exit(1);
    }

    const phoneNumber = process.env.LOCAL_TEST_PHONE_NUMBER;
    if (!phoneNumber) {
      console.error(
        '❌ LOCAL_TEST_PHONE_NUMBER environment variable must be set'
      );
      console.error('   Example: LOCAL_TEST_PHONE_NUMBER=+21670000000');
      process.exit(1);
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable must be set');
      process.exit(1);
    }

    // Create pool
    pool = new pg.Pool({ connectionString: databaseUrl });

    // OTP identifier format: phone-number-otp-{phoneNumber}
    const identifier = `phone-number-otp-${phoneNumber}`;

    // Query for active OTP record using PostgreSQL's timezone-consistent time calculation
    // expires_at is "timestamp without time zone", so comparison is consistent
    // Extract seconds remaining directly from PostgreSQL to avoid timezone mismatches
    const result = await pool.query(
      `SELECT 
        value,
        expires_at,
        EXTRACT(EPOCH FROM (expires_at - now()))::integer AS seconds_remaining
       FROM verifications 
       WHERE identifier = $1 
         AND expires_at > now()
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      console.log(`✗ No active OTP for ${phoneNumber}`);
      console.log('  Run: POST /auth/phone-number/send-otp first');
      process.exit(1);
    }

    const row = result.rows[0];
    const secondsRemaining: number = row.seconds_remaining;
    const storedValue: string = row.value;

    // Validate stored value format: Better Auth stores "${code}:${attemptCounter}"
    // Must contain at least one colon
    if (typeof storedValue !== 'string' || !storedValue.includes(':')) {
      console.error('❌ Invalid OTP format in database (missing attempt counter)');
      process.exit(1);
    }

    // Extract OTP code: take first part before the colon
    const parts = storedValue.split(':');
    const otpCode = parts[0];

    // Validate format: must be exactly 6 digits
    if (!/^\d{6}$/.test(otpCode)) {
      console.error(
        `❌ Retrieved OTP is not in valid 6-digit format (got: "${otpCode}")`
      );
      process.exit(1);
    }

    // Format remaining time for display
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    const timeStr =
      minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Display OTP with remaining time
    console.log(`✓ OTP: ${otpCode} (expires in ${timeStr})`);
    process.exit(0);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error('❌ Error retrieving OTP:', errorMessage);
    process.exit(1);
  } finally {
    // Reliably close pool with error handling
    if (pool) {
      try {
        await pool.end();
      } catch (closeError) {
        console.warn(
          '⚠️ Warning closing database pool:',
          closeError instanceof Error ? closeError.message : String(closeError)
        );
      }
    }
  }
}

retrieveLocalTestOtp();
