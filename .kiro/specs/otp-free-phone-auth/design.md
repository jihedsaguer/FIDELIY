# Design: OTP-Free Customer Phone Authentication

## Overview
Replace mandatory SMS OTP verification with direct phone number sign-in. Phone remains the unique customer identifier. Sessions persist via Better Auth HTTP-only cookies. No email or password required for customers.

## Architecture

### Identification vs. Authentication
- **Identification:** Phone number (unique, persistent, customer identifier)
  - Stored in `users.phone_number` (UNIQUE constraint, indexed)
  - Lookup mechanism across devices
  - Immutable per customer

- **Authentication:** Better Auth HTTP-only cookie session
  - Signs in with phone → creates Better Auth session
  - Session expires in 7 days (auto-renewed if active)
  - Cookie managed by Better Auth (signed, HttpOnly, Secure, SameSite=Strict)

### Phone Normalization & Validation
- Input: Any phone format ("+216 12 345 678", "0212345678", "21612345678", etc.)
- Process: 
  1. Strip non-digits (except leading +)
  2. Accept Tunisia +216 or local 0 prefix
  3. Normalize to E.164 format: "+21612345678"
  4. Validate length (12 chars: +216XXXXXXXX)
- Output: Normalized E.164 phone or validation error
- Storage: E.164 format in database

### Sign-In Flow (New)

```
POST /auth/phone/sign-in
├─ Input: { phoneNumber: string }
├─ Validation:
│  ├─ Normalize to E.164
│  ├─ Check valid Tunisian number
│  └─ Return 400 if invalid
├─ Lookup: SELECT user_id FROM users WHERE phone_number = normalized
│  ├─ Found: user_id = X
│  └─ Not found: CREATE user + provision customer_accounts
├─ Ensure customer_accounts exists (idempotent)
├─ Create Better Auth session via auth.api.createSession()
├─ Rate limit check (10/10min per IP)
├─ Log audit trail (IP, timestamp, success/fail, phone prefix only)
└─ Return: Set-Cookie + {user, session}
```

### Database Provisioning (Trigger Update)

**Current:** `IF phone_number_verified THEN provision customer_accounts`

**New:** Also provision on unverified phone assignment

```sql
CREATE OR REPLACE FUNCTION provision_customer_account_from_user()
RETURNS trigger AS $$
BEGIN
  -- Case 1: Phone with verification (OTP or recovery flow)
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number_verified THEN
    INSERT INTO customer_accounts (user_id, phone_number, phone_verified)
    VALUES (NEW.id, NEW.phone_number, true)
    ON CONFLICT (user_id) DO UPDATE
      SET phone_number = EXCLUDED.phone_number,
          phone_verified = true,
          updated_at = now();
  
  -- Case 2: Phone without verification (new direct sign-in)
  ELSIF NEW.phone_number IS NOT NULL AND 
        NEW.phone_number_verified IS FALSE AND
        (OLD IS NULL OR OLD.phone_number IS NULL) THEN
    INSERT INTO customer_accounts (user_id, phone_number, phone_verified)
    VALUES (NEW.id, NEW.phone_number, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Idempotency:** ON CONFLICT ensures safe concurrent calls. Phone remains marked unverified unless explicitly verified via OTP.

### Session Management
- No changes to existing Better Auth session mechanism
- Reuse existing `auth.api.createSession()` from Better Auth
- Cookie persistence, TTL, auto-renewal: unchanged
- Multi-device support: same phone = same user on all devices
- RLS context: unchanged (still set via app.user_id)

### Customer Identity Across Devices & Businesses
- **Device A:** Customer enters phone → session created → joins Business A
- **Device B:** Customer enters same phone → finds existing user → session created → sees all memberships (Business A + others)
- **No repeated registration required:** Phone lookup finds existing user automatically

### Rate Limiting
- **Rule:** 10 attempts per 10 minutes per IP address
- **Implementation:** Simple in-memory counter (Redis optional for Phase 2)
- **Tracking:** IP + endpoint + normalized phone prefix (not full number)
- **Response:** 429 Too Many Requests after limit exceeded
- **Reset:** 10-minute sliding window

### Audit Logging
- Log successful and failed sign-in attempts
- Data logged: IP address, timestamp, phone prefix (first 6 digits only), outcome (success/invalid/rate_limited)
- Exclude: Full phone number, session tokens, any sensitive auth data
- Purpose: Support investigation, fraud detection, account recovery verification

### Backward Compatibility
- **OTP endpoints preserved:** `/auth/phone-number/send-otp`, `/auth/phone-number/verify` still available
- **Existing OTP-verified customers:** Keep phone_verified=true, no changes
- **Merchant auth:** Completely unchanged (email/password flow)
- **Multi-capability:** Customers with merchant account remain unaffected

## API Contract

### New Endpoint: Phone Sign-In

**Request:**
```
POST /auth/phone/sign-in
Content-Type: application/json

{
  "phoneNumber": "+216 12 345 678"  // or "0212345678", etc.
}
```

**Success Response (200):**
```
Set-Cookie: betterAuth.session_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800

{
  "user": {
    "id": "uuid",
    "email": "21612345678@fideliy.local",
    "name": "+21612345678",
    "phoneNumber": "+21612345678"
  },
  "session": {
    "id": "uuid",
    "expiresAt": "2026-11-21T01:46:00.000Z"
  }
}
```

**Invalid Phone (400):**
```
{
  "error": "Invalid phone number. Use Tunisian format: +216XXXXXXXX"
}
```

**Rate Limited (429):**
```
{
  "error": "Too many sign-in attempts. Try again after 10 minutes."
}
```

**Server Error (500):**
```
{
  "error": "Authentication service error"
}
```

## Frontend Integration

### New Component: CustomerPhoneLoginPage
- Input: Phone number (simple text field with label "Your phone number")
- Validation: Client-side format hints; server validates
- Submit: POST /auth/phone/sign-in
- Loading: Show spinner during request
- Error: Display error message (invalid format, rate limited, etc.)
- Success: Redirect to customer dashboard

### Replace Existing OTP Flow
- Remove: OTP code entry screen, send-code button, timer
- Remove: All OTP-related RTK Query endpoints from frontend
- Keep: Session restoration (useGetSessionQuery), logout behavior

### State Management
- Reuse existing: useGetSessionQuery, useSignOut, AuthContext
- New mutation: usePhoneSignInMutation
- Session refresh: Existing mechanism, no changes

## Testing Strategy

- **Backend unit tests:** Phone normalization, database provisioning, rate limiting
- **Backend integration tests:** End-to-end sign-in, session creation, customer provisioning
- **Frontend unit tests:** Phone input validation, sign-in form submission
- **Frontend integration tests:** Sign-in flow, session restoration, redirect
- **Regression tests:** Existing OTP flow (if preserved), merchant auth, RLS isolation
- **Concurrency tests:** Duplicate phone attempts, concurrent sign-in

## Security Model

| Component | Security Property | Mechanism |
|-----------|-------------------|-----------|
| **Phone Uniqueness** | Prevents bulk account creation | DB UNIQUE constraint |
| **Unverified Status** | Tracks identity trust level | phoneVerified=false stored |
| **Session Isolation** | Prevents cross-tenant access | RLS + app.user_id context |
| **Rate Limiting** | Prevents brute-force | 10 attempts/10min per IP |
| **Audit Trail** | Enables dispute resolution | IP + timestamp + outcome logged |
| **Cookie Security** | Prevents tampering/theft | HttpOnly + Secure + SameSite + Signed |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Phone impersonation (no OTP) | Audit trail + support verification process |
| Concurrent duplicate sign-in | Database ON CONFLICT handles atomically |
| Session hijacking | HTTP-only cookie + HTTPS + SameSite |
| Rate-limit bypass (distributed attack) | IP-based tracking; Phase 2: Redis for distributed tracking |
| Provisioning race condition | Trigger ON CONFLICT ensures idempotency |

## Files to Create/Modify

### Backend
- `backend/src/features/auth/auth.service.ts` — Add phone sign-in method
- `backend/src/features/auth/auth.controller.ts` — Add phone endpoint (or auth.handler forwards)
- `backend/src/features/auth/phone-auth.service.ts` (new) — Phone normalization, validation, rate limiting
- `backend/src/database/migrations/0010_phone_unverified_provisioning.sql` (new) — Trigger update
- `backend/src/features/auth/dto/phone-sign-in.dto.ts` (new) — Phone sign-in DTO with validation

### Frontend
- `frontend/src/features/auth/pages/CustomerPhoneLoginPage.tsx` (new) — Replace OTP screen
- `frontend/src/features/auth/api/authApi.ts` — Add usePhoneSignInMutation
- `frontend/src/app/routes.ts` — Update customer login route

### Tests
- `backend/test/unit/phone-auth.service.spec.ts` (new)
- `backend/test/integration/phone-sign-in.integration.spec.ts` (new)
- `frontend/src/features/auth/pages/CustomerPhoneLoginPage.test.tsx` (new)

## Out of Scope
- Device fingerprinting
- Passkeys/WebAuthn
- Multi-manager support
- Email/password for customers
- OTP-only enforcement (OTP remains available but not mandatory)
