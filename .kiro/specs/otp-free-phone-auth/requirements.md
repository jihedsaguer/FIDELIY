# Requirements: OTP-Free Customer Phone Authentication

## Functional Requirements

### R1: Phone-Based Customer Identification
- Phone number is the unique, persistent customer identifier
- Customers can access accounts using their phone number without OTP
- Phone numbers must be normalized to E.164 format for consistency
- Phone uniqueness enforced at database level

### R2: Phone Validation
- Accept Tunisian phone numbers in any common format
- Validate format before account lookup
- Return clear error message for invalid formats
- Normalize to E.164 (+216XXXXXXXX) consistently

### R3: Customer Account Provisioning
- Automatically provision customer_accounts record on phone sign-in
- Mark new accounts as unverified (phoneVerified=false)
- Support idempotent provisioning (safe for concurrent requests)
- Preserve existing verified accounts unchanged

### R4: Session Management
- Create persistent Better Auth sessions on successful phone sign-in
- Sessions expire after 7 days (auto-renewed if active)
- Use HTTP-only cookies (no JavaScript access)
- Support multi-device access (same phone = same identity)

### R5: Cross-Device & Cross-Business Identity
- Same phone number grants access to all memberships across devices
- Existing customers retain all existing identities and balances
- New customers can immediately join programs after sign-in
- RLS prevents cross-tenant data leakage (unchanged)

### R6: Rate Limiting
- Limit sign-in attempts to 10 per 10 minutes per IP address
- Return 429 Too Many Requests after limit exceeded
- Include retry-after hint in response
- Reset limit on 10-minute sliding window

### R7: Audit Logging
- Log successful and failed sign-in attempts
- Log IP address, timestamp, phone prefix (first 6 digits), outcome
- Do NOT log full phone numbers or session tokens
- Enable support investigation and fraud detection

### R8: Backward Compatibility
- Preserve existing OTP endpoints for optional recovery or verified flows
- Keep phone_verified status distinction (never auto-mark as verified)
- Maintain merchant authentication unchanged
- Support customers with both customer and merchant capabilities

## Non-Functional Requirements

### NF1: UX Friction
- Sign-in completed in <5 seconds (vs. 30-60s with OTP)
- Minimize required inputs (phone number only)
- Clear error messages guide user correction

### NF2: Security
- No weaker than OTP (identity mitigated by phone uniqueness + audit trail)
- Rate limiting prevents brute-force
- Sessions signed and encrypted
- RLS isolation preserved

### NF3: Reliability
- Idempotent provisioning (safe concurrent attempts)
- Graceful session creation failures (clear error, not silent)
- Database constraints enforce uniqueness

### NF4: Performance
- Phone lookup: <100ms
- Account provisioning: <200ms
- Session creation: <150ms
- Sign-in response: <500ms total

### NF5: Testability
- Unit tests for phone normalization
- Integration tests for full sign-in flow
- Regression tests for existing auth paths
- Concurrency tests for race conditions

## Acceptance Criteria

### A1: New Customer Sign-In
- ✅ Customer enters "+216 12 345 678"
- ✅ Backend normalizes to "+21612345678"
- ✅ User created, customer_accounts provisioned (unverified)
- ✅ Better Auth session created
- ✅ Session cookie returned
- ✅ Customer redirected to dashboard
- ✅ Can immediately join programs

### A2: Returning Customer Sign-In
- ✅ Customer enters "+216 12 345 678"
- ✅ Existing user found
- ✅ Existing customer_accounts reused
- ✅ New session created (multi-device support)
- ✅ Session cookie returned
- ✅ All existing memberships visible

### A3: Existing OTP-Verified Customer
- ✅ Phone marked as phoneVerified=true (unchanged)
- ✅ Can still sign in with phone (no OTP required)
- ✅ Account identity and balances preserved
- ✅ Backward compatible with existing data

### A4: Invalid Phone Numbers
- ✅ Return 400 error with clear message
- ✅ Examples: "+33 (France)", "invalid", "", null
- ✅ User can correct and retry

### A5: Rate Limiting
- ✅ 10 attempts per 10 minutes per IP
- ✅ 11th attempt returns 429
- ✅ After 10 minutes: attempts reset

### A6: Concurrent Sign-In
- ✅ Two simultaneous requests with same phone
- ✅ Both create one user (database UNIQUE constraint)
- ✅ Both get valid sessions (one succeeds, one gets conflict then succeeds on retry)
- ✅ No data corruption

### A7: Session Restoration
- ✅ Browser closes/reopens with valid cookie
- ✅ useGetSessionQuery() returns user + session
- ✅ Customer dashboard loads
- ✅ All memberships intact

### A8: Logout
- ✅ POST /auth/sign-out invalidates session
- ✅ useGetSessionQuery() returns null
- ✅ Customer redirected to home
- ✅ New sign-in required

### A9: Merchant Auth Regression
- ✅ Merchant email/password flow unchanged
- ✅ Merchant OTP (if used) unchanged
- ✅ Merchant dashboard accessible
- ✅ No cross-user leakage

### A10: RLS & Multi-Tenancy
- ✅ Customer A cannot see Customer B's memberships
- ✅ Customer cannot see merchant data
- ✅ RLS context properly scoped per request
- ✅ Audit logs confirm isolation

## Definition of Done
- All acceptance criteria verified ✅
- Backend unit tests pass ✅
- Backend integration tests pass ✅
- Frontend unit tests pass ✅
- Frontend builds successfully ✅
- No regressions in existing auth flows ✅
- Security review: no new vulnerabilities ✅
- Audit logging working correctly ✅
