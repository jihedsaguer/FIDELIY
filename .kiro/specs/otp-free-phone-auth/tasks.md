# Tasks: OTP-Free Customer Phone Authentication

## Task Breakdown

### Backend Implementation

#### T1: Phone Normalization & Validation Service
**Objective:** Create reusable phone validation and normalization.

**Subtasks:**
1. Create `backend/src/features/auth/phone-auth.service.ts`
2. Implement `normalizePhoneNumber(input: string): string | null`
   - Strip spaces, dashes, parentheses
   - Accept +216, 0216, 216, 0 prefixes
   - Validate E.164 format
   - Return +21612345678 or null
3. Implement `isValidTunisianPhone(phone: string): boolean`
   - Check E.164 format
   - Verify +216 prefix
   - Check 12-char length (+216XXXXXXXX)
4. Unit tests for:
   - Valid formats ("+216 12 345 678", "0212345678", "+21612345678")
   - Invalid inputs ("", "invalid", "+33...", "123")

**Files:** 
- Create: `backend/src/features/auth/phone-auth.service.ts`
- Create: `backend/test/unit/phone-auth.service.spec.ts`

---

#### T2: Phone Sign-In Endpoint
**Objective:** Implement `POST /auth/phone/sign-in` using Better Auth session API.

**Subtasks:**
1. Create DTO: `backend/src/features/auth/dto/phone-sign-in.dto.ts`
   - `phoneNumber: string`
   - Validation: not empty, normalization attempt
2. Add method to `auth.service.ts`: `phoneSignIn(phoneNumber: string): Promise<{ user, session }>`
   - Normalize phone
   - Query: SELECT user_id FROM users WHERE phone_number = normalized
   - If found: use existing user_id
   - If not found: CREATE users record + provision customer_accounts
   - Create Better Auth session: `auth.api.createSession({ userId })`
   - Return: { user, session }
3. Add endpoint to `auth.handler.ts` or `auth.controller.ts`:
   - POST /auth/phone/sign-in
   - Inject PhoneAuthService + RateLimitService
   - Check rate limit
   - Call phoneSignIn()
   - Log audit trail (IP, timestamp, outcome)
   - Return session + Set-Cookie
4. Error handling:
   - Invalid phone → 400 Bad Request
   - Rate limited → 429 Too Many Requests
   - Concurrent creation → retry or return success (ON CONFLICT handles it)
   - Session creation failure → 500

**Files:**
- Create: `backend/src/features/auth/dto/phone-sign-in.dto.ts`
- Modify: `backend/src/features/auth/auth.service.ts` (add phoneSignIn method)
- Modify: `backend/src/features/auth/auth.handler.ts` or auth.controller.ts (add route)
- Create: `backend/test/integration/phone-sign-in.integration.spec.ts`

---

#### T3: Rate Limiting Service
**Objective:** Implement IP-based rate limiting (10 requests/10 min).

**Subtasks:**
1. Create `backend/src/shared/security/rate-limit.service.ts`
2. Implement in-memory rate limiter:
   - Track: IP address → request count + timestamp
   - Check: IP, endpoint, timestamp
   - If count < 10 in last 10 min: allow (increment)
   - If count >= 10: reject with 429
   - Cleanup: Remove expired entries periodically
3. Integration with phone endpoint:
   - Extract IP from request.ip
   - Check rate limit before phoneSignIn()
   - Return 429 if exceeded
4. Unit tests:
   - Allow first 10 requests per IP
   - Reject 11th request (429)
   - Reset after 10 minutes
   - Different IPs tracked independently

**Files:**
- Create: `backend/src/shared/security/rate-limit.service.ts`
- Create: `backend/test/unit/rate-limit.service.spec.ts`

---

#### T4: Audit Logging
**Objective:** Log sign-in attempts without storing sensitive data.

**Subtasks:**
1. Create audit log method in PhoneAuthService or separate service:
   - `logSignInAttempt(ip: string, phonePrefix: string, outcome: 'success' | 'invalid' | 'rate_limited' | 'error'): void`
   - Log to console + optional file
   - Data: IP, timestamp, phone prefix (first 6 digits only), outcome
   - Exclude: Full phone, session tokens, user IDs
2. Call from phone sign-in endpoint after each attempt
3. Format: JSON for easy parsing
4. No database writes (simple file/console logging for MVP)

**Files:**
- Modify: `backend/src/features/auth/auth.service.ts` or phone-auth.service.ts (add logging calls)
- No tests required (simple logging)

---

#### T5: Database Provisioning Trigger Update
**Objective:** Update trigger to provision unverified customer accounts.

**Subtasks:**
1. Create migration: `backend/src/database/migrations/0010_phone_unverified_provisioning.sql`
2. Update function `provision_customer_account_from_user()`:
   - Keep existing logic (verified phone)
   - Add: Provision on unverified phone IF new phone_number AND first time
3. Ensure idempotency:
   - ON CONFLICT (user_id) DO NOTHING or UPDATE (existing logic)
4. Test migration:
   - Run: `npm run db:migrate`
   - Verify trigger compiles
   - Test with integration tests

**Files:**
- Create: `backend/src/database/migrations/0010_phone_unverified_provisioning.sql`
- Modify: migration metadata if needed

---

### Frontend Implementation

#### T6: Customer Phone Login Page
**Objective:** Replace OTP screen with simple phone input.

**Subtasks:**
1. Create `frontend/src/features/auth/pages/CustomerPhoneLoginPage.tsx`
   - Input field: "Your phone number"
   - Placeholder: "+216 12 345 678" or "0212345678"
   - Submit button: "Access my rewards"
   - Loading state: Spinner during POST
   - Error display: Show server error or validation error
   - Success: Redirect to customer dashboard
2. Form submission:
   - Normalize phone (optional client-side hint)
   - Call: usePhoneSignInMutation
   - On success: Redirect to `/customer/dashboard`
   - On error: Display error message
3. Styling: Match existing auth page design (HomePage pattern)

**Files:**
- Create: `frontend/src/features/auth/pages/CustomerPhoneLoginPage.tsx`
- Create: `frontend/src/features/auth/pages/CustomerPhoneLoginPage.test.tsx`

---

#### T7: RTK Query Mutation for Phone Sign-In
**Objective:** Add phone sign-in mutation to authApi.

**Subtasks:**
1. Modify `frontend/src/features/auth/api/authApi.ts`
2. Add endpoint:
   ```
   phoneSignIn: build.mutation<{ user: AuthSession['user'] }, string>({
     query: (phoneNumber) => ({
       url: '/auth/phone/sign-in',
       method: 'POST',
       body: { phoneNumber },
     }),
     invalidatesTags: ['Session'],
   })
   ```
3. Export: `usePhoneSignInMutation`
4. Test mutation with mock backend

**Files:**
- Modify: `frontend/src/features/auth/api/authApi.ts`
- Modify: `frontend/src/features/auth/pages/CustomerPhoneLoginPage.tsx` (use mutation)

---

#### T8: Update Home Page & Routing
**Objective:** Replace OTP link with phone login, update navigation.

**Subtasks:**
1. Modify `frontend/src/app/routes.ts`:
   - Change customer login route from `/auth/customer-otp` to `/auth/customer-phone`
2. Modify `frontend/src/features/auth/pages/HomePage.tsx`:
   - Link to phone login page (not OTP)
   - Keep copy simple: "Join with your phone number"
3. Update auth flow detection:
   - If logged in: show customer/merchant options
   - If not: show home with login links

**Files:**
- Modify: `frontend/src/app/routes.ts`
- Modify: `frontend/src/features/auth/pages/HomePage.tsx`

---

#### T9: Frontend Tests
**Objective:** Test phone login form and integration.

**Subtasks:**
1. Unit tests for `CustomerPhoneLoginPage.tsx`:
   - Phone input renders
   - Submit calls mutation
   - Error message displays on failure
   - Loading spinner shows during request
   - Redirect on success
2. Mutation test:
   - `usePhoneSignInMutation` calls correct endpoint
   - Handles 400 (invalid phone)
   - Handles 429 (rate limited)
   - Handles 500 (server error)

**Files:**
- Create: `frontend/src/features/auth/pages/CustomerPhoneLoginPage.test.tsx`
- Modify: `frontend/src/features/auth/api/authApi.ts` tests (add phone mutation)

---

### Integration & Regression Testing

#### T10: Backend Integration Tests
**Objective:** Full sign-in flow testing.

**Subtasks:**
1. Test: New customer sign-in
   - POST /auth/phone/sign-in with new phone
   - User created
   - Customer_accounts provisioned (unverified)
   - Session created
   - Response includes user + session
2. Test: Returning customer sign-in
   - POST /auth/phone/sign-in with existing phone
   - No new user created
   - Session created
   - Existing memberships accessible
3. Test: Invalid phone number
   - 400 response
   - User NOT created
4. Test: Rate limiting
   - 10 attempts succeed
   - 11th attempt: 429
   - After reset: succeeds again
5. Test: Concurrent attempts
   - Two simultaneous requests, same phone
   - Both resolve (one creates user, one reuses)
6. Test: Existing OTP-verified customer
   - phoneVerified=true preserved
   - Can sign in without OTP
7. Test: RLS isolation
   - Customer A cannot see Customer B's data
   - CustomerGuard enforces access

**Files:**
- Create: `backend/test/integration/phone-sign-in.integration.spec.ts`
- Modify: `backend/test/integration/customer-membership.integration.spec.ts` (add regression test for OTP customers)

---

#### T11: Regression Tests
**Objective:** Ensure existing auth flows still work.

**Subtasks:**
1. Merchant email/password sign-in (unchanged)
2. Customer OTP flow (if preserved)
3. Session validation
4. Logout
5. Multi-device customer identity
6. RLS isolation

**Files:**
- Modify: `backend/test/integration/auth.integration.spec.ts` (add merchant regression)
- Modify: `frontend/src/features/auth/AuthProvider.test.tsx` (add merchant login regression)

---

#### T12: Build & Verification
**Objective:** Compile, test, verify no regressions.

**Subtasks:**
1. Backend:
   - `npm run build --prefix backend` → No TypeScript errors
   - `npm test --prefix backend` → All tests pass
   - `npm run db:migrate --prefix backend` → Migration applies cleanly
2. Frontend:
   - `npm run build --prefix frontend` → No TypeScript errors
   - `npm test --prefix frontend` → All tests pass
3. Manual verification:
   - Start backend: `npm run start:dev --prefix backend`
   - Start frontend: `npm run dev --prefix frontend`
   - Sign in with phone number (new and existing)
   - Verify session, redirect, dashboard access
   - Verify merchant auth still works

**Files:** None (verification only)

---

## Task Dependencies & Order

```
T1 (Phone Validation) 
  ↓
T2 (Phone Sign-In Endpoint) — depends on T1
  ↓
T3 (Rate Limiting) — parallel with T2
  ↓
T4 (Audit Logging) — depends on T2, T3
  ↓
T5 (Database Migration) — depends on T2 (for testing)
  ↓
T6 (Frontend Phone Page) — parallel with backend
  ↓
T7 (RTK Mutation) — depends on T6, T2
  ↓
T8 (Routing/Home) — depends on T6, T7
  ↓
T9 (Frontend Tests) — depends on T6, T7, T8
  ↓
T10 (Integration Tests) — depends on all backend tasks
  ↓
T11 (Regression Tests) — depends on T10
  ↓
T12 (Build & Verification) — final step
```

## Estimated Timeline

- **Backend:** 6-8 hours (T1–T5)
- **Frontend:** 4-5 hours (T6–T9)
- **Integration & Testing:** 3-4 hours (T10–T12)
- **Total:** 13-17 hours (~2 days)

## Success Criteria

✅ All tasks completed
✅ All tests passing
✅ No TypeScript errors
✅ No regressions in existing auth
✅ New customer sign-in works (phone → session → dashboard)
✅ Returning customer sign-in works (finds existing user, creates new session)
✅ Rate limiting works (429 on 11th attempt)
✅ Audit logging captures sign-in attempts (no sensitive data)
✅ RLS isolation maintained (CustomerGuard enforces access)
✅ Merchant auth unchanged
✅ Multi-device identity works (same phone on different devices)
