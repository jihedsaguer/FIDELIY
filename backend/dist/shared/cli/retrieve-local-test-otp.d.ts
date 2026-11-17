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
export {};
//# sourceMappingURL=retrieve-local-test-otp.d.ts.map