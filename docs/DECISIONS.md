# Architectural Decisions

This document records all major architectural decisions made during Phase 0 and approved for Release 1 implementation.

## Format

- **Decision:** What was decided
- **Rationale:** Why this choice was made
- **Alternatives:** What was considered but rejected
- **Status:** APPROVED | PROPOSED | PENDING | DEFERRED
- **Evidence/Notes:** Link to documentation, POC results, or context

---

## APPROVED DECISIONS

### 1. Frontend: React 18 + Vite + TypeScript

> **Superseded in part (2026-11-21):** the frontend runs React 19; see #17.

**Decision:** Use React 18 with Vite build tool and TypeScript for type safety.

**Rationale:**
- React: Large ecosystem, strong community, good performance
- Vite: 10x faster build times than Webpack; excellent DX
- TypeScript: Type safety reduces runtime errors; better IDE support

**Alternatives:**
- Next.js (rejected: adds server-side complexity; backend is separate NestJS)
- Vue.js (rejected: smaller ecosystem for enterprise features)
- Svelte (rejected: less community adoption; FIDELIY uses React pattern known to team)

**Status:** ✅ **APPROVED**

**Evidence:** Evaluated in Phase 0; Vite benchmarked faster than Next.js for SPA context

---

### 2. Backend: NestJS + Modular Monolith

**Decision:** Use NestJS framework with modular monolith architecture (8 modules).

**Rationale:**
- NestJS: Strong TypeScript support, built-in DI, middleware, guards
- Monolith: Simpler deployment than microservices; easier debugging; good for Release 1 scale
- Modules: Clear separation of concerns (auth, customers, merchants, programs, loyalty, admin, shared, database)

**Alternatives:**
- Express (rejected: too minimal; requires manual structure)
- Django/Spring (rejected: different language ecosystem)
- Microservices (rejected: premature for MVP; added complexity without need)

**Status:** ✅ **APPROVED**

**Evidence:** Evaluated in Phase 0; NestJS guards and middleware directly support role-based access

**Module Structure:**
```
auth, customers, merchants, programs, loyalty (with sub-modules: earning, redemption, balances), 
admin, shared (guards, utils, error handling), database (Drizzle schema)
```

---

### 3. Database: PostgreSQL + Drizzle ORM

> **Superseded in part (2026-11-21):** Supabase is not the current development database; see #18.

**Decision:** Use PostgreSQL with Drizzle ORM, pg driver (node-postgres) for development.

**Rationale:**
- PostgreSQL: ACID transactions prevent double-spending; RLS provides native multi-tenancy
- Drizzle: Full TypeScript support, SQL-like API, zero abstraction overhead, portable between Supabase and Neon
- pg driver: Robust, widely used; Neon HTTP driver available for serverless future

**Alternatives:**
- Prisma ORM (rejected: less control; harder to debug complex queries; harder to implement RLS)
- MongoDB (rejected: no ACID transactions; no RLS; requires workarounds for integrity)
- Supabase-specific features (rejected: keeps code portable; only uses standard PostgreSQL)

**Status:** ✅ **APPROVED**

**Evidence:** Evaluated in Phase 0; Drizzle portability verified between Supabase and Neon

**Migration Path:**
- Development: Supabase PostgreSQL
- Production Alternative: Neon (via Drizzle portability, no code changes)

---

### 4. Authentication: Better Auth (Official) with Phone Number Plugin + Email/Password

> **Superseded in part:** the immutable `user.userType` field below was replaced by account-table capabilities in #11 (the code has no `userType`); phone OTP is deferred to Release 2 by #16 (2026-11-21 reconciliation).

> **Release 1 note (Decision #16):** customer phone numbers are unique identifiers and are not OTP-verified in Release 1; OTP verification is deferred to Release 2. The OTP wording below describes the Release 2 verification path.

**Decision:** Use Better Auth with official Phone Number plugin for customers and email/password for merchants. Single instance; no separate identity system.

**Rationale:**
- Better Auth: Framework-agnostic, extensible, production-ready
- Phone Number Plugin: Official (maintained), OTP support, custom SMS provider integration
- Email/Password: Built-in Better Auth provider for merchants
- Single Instance: Unified session management; account type managed via immutable `user.userType` field

**Change from Phase 0:**
- **Original (Phase 0):** Custom OTP implementation required (Better Auth lacked phone support)
- **Updated (Phase 0 Review):** Better Auth Phone Number plugin now available (official, production-ready)
- **Result:** Reduced risk, simplified implementation, vendor support available

**Alternatives:**
- Firebase Auth (rejected: vendor lock-in; expensive at scale)
- Auth0 (rejected: expensive; overkill for MVP)
- Custom auth (rejected: security risk, time-consuming)

**Status:** ✅ **APPROVED**

**Evidence:** Better Auth Phone Number plugin documentation validated; integration with NestJS confirmed via @thallesp/nestjs-better-auth package

**Integration Pattern:**
```
Single Better Auth instance:
├─ Phone Number Plugin (customers: OTP via SMS)
├─ Email/Password Provider (merchants: email verification)
└─ Shared session store (both account types)
```

Account separation enforced by:
- Immutable `user.userType` field in database
- NestJS guards (CustomerGuard, MerchantGuard)
- Separate customer and merchant database tables

---

### 5. Email: Resend

**Decision:** Use Resend for transactional email delivery.

**Rationale:**
- Simple API, good DX
- Transactional focus (not marketing campaigns)
- Supports React email templates
- Cost-effective for MVP

**Alternatives:**
- SendGrid (rejected: overkill features; more expensive)
- AWS SES (rejected: complex setup; steeper learning curve)

**Status:** ✅ **APPROVED**

**Evidence:** Evaluated in Phase 0; simple integration confirmed

---

### 6. SMS Provider: Pending Tunisian +216 Validation

> **Release 1 note (Decision #16):** SMS/OTP delivery is deferred to Release 2 and does not block Release 1.

**Decision:** Research and select SMS provider supporting Tunisia (+216) for customer phone OTP.

**Candidates:**
- Twilio
- Vonage
- Infobip
- Other regional African providers

**Selection Criteria:**
- Explicit Tunisia (+216) support
- Pricing (cost per SMS in Tunisia)
- Delivery reliability
- API quality and documentation
- Integration with Better Auth Phone Number plugin's `sendOTP` callback

**Status:** ⏳ **PENDING VALIDATION**

**Timeline:** Phase 1A research; selection by end of Phase 1A for Phase 1B integration

**Integration Pattern:** Via Better Auth Phone Number plugin's `sendOTP` callback:
```typescript
phoneNumber({
  sendOTP: ({ phoneNumber, code }, ctx) => {
    // Call selected SMS provider API
    await smsProvider.send({
      to: phoneNumber,
      message: `Your code: ${code}`
    })
  }
})
```

---

### 7. Multi-Tenancy via PostgreSQL Row-Level Security (RLS)

**Decision:** Enforce multi-tenant data isolation at the database level using PostgreSQL RLS policies.

**Rationale:**
- Database-level enforcement: Cannot be bypassed by application bugs
- PostgreSQL native: No additional infrastructure
- Combined with application guards: Defense-in-depth

**RLS Context:**
- Customer queries filtered by their own ID
- Merchant queries filtered by their business IDs
- Customer data completely invisible to merchants and other customers

**Status:** ✅ **APPROVED**

**Evidence:** RLS policies designed and documented in `docs/DATABASE.md`

---

### 8. Atomic Transactions for Loyalty Operations

**Decision:** Use PostgreSQL SERIALIZABLE isolation level + pessimistic locking for all loyalty transactions (earning and redemption).

**Rationale:**
- Prevent double-spending
- Ensure consistency under concurrent operations
- Audit trail for all changes

**Pattern:**
```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- Verify eligibility
  -- Update balance
  -- Record transaction
COMMIT;
```

**Status:** ✅ **APPROVED**

**Evidence:** Transaction patterns documented; comprehensive concurrency tests planned for Phase 1D

---

### 9. Frontend Organization: Feature-Based Structure

**Decision:** Organize React frontend by feature (auth, customer-dashboard, merchant-dashboard) rather than by file type.

**Rationale:**
- Feature modules are self-contained
- Easier to find related code
- Scales better as product grows

**Structure:**
```
src/features/
├── auth/
├── customer-dashboard/
├── merchant-dashboard/
├── admin/
└── shared/
```

**Status:** ✅ **APPROVED**

**Evidence:** Documented in `docs/ARCHITECTURE.md` (frontend structure) and `docs/DESIGN_SYSTEM.md`

---

### 10. UI Component Library: shadcn/ui

> **Superseded (2026-11-21):** shadcn/ui was removed; the UI uses in-repo primitives; see #17.

**Decision:** Use shadcn/ui (headless UI components) as primary UI foundation.

**Rationale:**
- Headless components: Full customization via Tailwind
- TypeScript support
- Small bundle impact
- Styled with Tailwind CSS

**Alternative:** Headless UI (rejected: shadcn/ui ecosystem larger)

**Status:** ✅ **APPROVED** (Phase 1E onwards)

**Phase Application:** Dashboards and forms (Phase 1E); initial MVP can use basic HTML+Tailwind

---

### 11. Separate Global Identity from Account Capabilities

**Decision:** Decouple global user identity from application capabilities. One person can have **both** customer and merchant accounts.

**Model:**
```
users (global identity)
├─ id: UUID
├─ email: varchar (optional)
├─ phoneNumber: varchar (optional)
└─ createdAt: timestamp

customer_accounts (capability)
├─ id: UUID
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ phoneVerified: boolean
└─ joinedAt: timestamp

merchant_accounts (capability)
├─ id: UUID
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ businessName: varchar (optional)
├─ emailVerified: boolean
└─ registeredAt: timestamp
```

**Rationale:**
- One person can collect rewards (customer) AND manage a loyalty program (merchant)
- Simpler than mutually-exclusive userType field
- Extensible: Add third account type later without schema changes
- Table membership determines capabilities, not field enum

**Authentication:**
- Better Auth session tied to `users.id`
- NestJS guards check `customer_accounts` or `merchant_accounts` table membership
- No "role switching" UI needed; users access what they have accounts for

**Enforcement:**
- UNIQUE constraints on (user_id) per account type table
- Guards verify account existence before endpoint access
- RLS policies enforce data isolation per account type

**Status:** ✅ **APPROVED**

**Evidence:** Supports Release 1 requirement of one person having multiple capabilities; simpler implementation than userType enum; extensible for future features

---

### 12. Versioned Business-Level Programme Configuration

**Decision:** Store each selected programme version in `programs`, owned by a business, with one `program_configurations` record for each enabled type (`stamps` and/or `points`). Programme versions are never overwritten to publish a change; the active version is deactivated and a new version is inserted atomically.

**Rationale:**
- Every branch shares the business-owned programme through its existing `business_id` relationship.
- Historical configuration identity remains stable for future activity references.
- A partial unique index allows at most one active version per business, preventing conflicting active programme types.
- No stamps/points rules, conversion, rewards, subscription entitlements, or customer activity are inferred.

**Lifecycle:** `status`, `activated_at`, and `deactivated_at` make activation explicit. New versions retain old settings; `program_configurations.id` is the future reference point for configuration-specific loyalty activity. The schema restricts deletion of programme history.

**Status:** Implemented for Checkpoint 6A.

**Evidence:** `backend/src/features/programs/`, migration `0005_versioned_program_configuration`, and `docs/DATABASE.md`.

---

### 13. Checkpoint 6B-A: Business-Level Customer Memberships and Dual QR Discovery

**Decision:** Customer memberships belong to businesses, not individual branches. Introduce `customer_business_memberships` with unique `(customer_account_id, business_id)`, lifecycle audit trail in `membership_lifecycle_events`, separate public business QR identifiers (`businesses.public_qr_id`) alongside branch QR identifiers, and personal customer QR credentials.

**Rationale:**
- Customers join the business brand; branches share the loyalty programme.
- Rejoining reactivates the existing membership and appends a lifecycle event.
- Business public QR and personal customer QR have distinct purposes.

**Status:** Implemented for Checkpoint 6B-A.

**Evidence:** `backend/src/features/customers/`, migration `0006_customer_business_memberships`, and `test/customer-membership.integration.spec.ts`.

---

### 14. Checkpoint 6B-B: Secure Customer QR Credentials and Internal Loyalty Ledger Foundation

**Decision:**
1. **Secure Customer QR Credentials (return-once and status-only parts superseded by #20):** Store credentials as SHA-256 hex hashes in `customer_qr_credentials.credential_hash`. Return the raw 43-character base64url secret only once upon initial issuance or rotation. Customer read endpoint returns status metadata only (`{ issuedAt, active: true }`). Merchant QR resolution endpoint compares the presented credential's SHA-256 hash against active records in the database and verifies active business membership.
2. **Internal Loyalty Ledger:** Create immutable transaction headers (`loyalty_transactions`) and typed signed entries (`loyalty_activity_entries`) referencing exact `program_configurations.id` records. Enforce append-only integrity via PostgreSQL triggers (`reject_loyalty_ledger_mutation`). Enforce business-scoped idempotency via `(business_id, idempotency_key)` uniqueness and deterministic SHA-256 canonical request fingerprinting. Execute ledger operations in serializable transactions with bounded retry for both PostgreSQL serialization conflicts (`40001`) and deadlock detections (`40P01`). Enforce full reversal integrity (single reversal per transaction via partial unique index, single reversal per activity entry via partial unique index, full entry set coverage, and exact inverse delta matching `delta = -original.delta`).
3. **Internal Service Boundary:** Maintain `LoyaltyLedgerService` as an internal service foundation without client-facing or merchant-facing write routes, earning formulas, balance projections, or reward redemptions.

**Status:** Implemented for Checkpoints 6B-B and 6B-B.1.

**Evidence:** `backend/src/features/loyalty/loyalty-ledger.service.ts`, `backend/src/shared/security/customer-qr.ts`, migrations `0007_secure_customer_qr_loyalty_ledger.sql` and `0008_full_reversal_integrity.sql`, `test/unit/loyalty-ledger.service.spec.ts`, `test/unit/tenant-context.service.spec.ts`, and `test/loyalty-ledger.integration.spec.ts`.

---

### 15. Checkpoint 6B-C: Stamp Earning, Reward Redemption, and Loyalty Corrections

**Decision (approved business rules):**

1. **Workflow.** The merchant scans the customer's personal QR, the server resolves the customer and verifies active membership, the merchant records the purchase (and, for redemption, selects a reward), and the server calculates and writes one atomic ledger transaction. The server never trusts client-supplied earning results.
2. **Stamp earning.** A confirmed qualifying purchase awards **exactly one stamp**. The purchase amount never determines the number of stamps. For stamp-only programmes the purchase amount is **optional**; when supplied it is stored. `purchasesPerStamp` is **deprecated** for the new earning rules and must not be used to calculate new stamps. Historical programme versions and the transaction references to them are preserved unchanged. If an existing active configuration needs conversion, a **new programme version** is created through the existing versioning mechanism; historical configuration rows are never rewritten.
3. **Points earning.** The purchase amount is **required** for programmes that include points. Points = `floor(amount_millimes x rate / 1000)` using integer arithmetic only. The earning rate keeps at most **two decimal places** and is applied as an integer number of hundredths (`floor(millimes x rate_hundredths / 100000)`). Fractions of a point are discarded (round down).
4. **Combined programmes.** Stamps and points accumulate independently on each purchase and keep independent balances. Each reward costs exactly one currency (stamps **or** points), never a mix.
5. **Money.** Monetary values are held as **integer millimes** (TND has three decimal places), stored as `bigint`. API requests carry amounts as **decimal strings** (e.g. `"12.500"`), validated as positive with at most 3 decimal places and converted to millimes once at the API boundary. No floating-point arithmetic and no silent rounding to two decimals.
6. **Transaction record and history.** The supplied purchase amount is stored in integer millimes on the transaction header. Each entry keeps its exact `program_configurations.id` (immutable programme version), and each earning stores an **explicit earning-rate snapshot** (rule 14). Historical ledger entries are authoritative: **past earnings are never recalculated with current programme rules**, and programme changes affect only future transactions.
7. **Rewards.** Multiple rewards per programme are stored as reward thresholds in the versioned programme configuration (no separate `rewards` table, no reward codes, no reward inventory in Release 1). The merchant selects a reward; the server verifies the customer's balance in the same serializable transaction, deducts the reward's cost and preserves any surplus. Redemptions are recorded as their own transaction category (`redemption`), not as a manual adjustment. Rewards are redeemable at any branch of the business.
8. **Reversals (corrections).** The business owner may reverse any transaction of their business at any time (no time limit), in **full only** (no partial edits; to correct, reverse and re-enter). A reversal:
   - references its original transaction and can occur **once** per transaction;
   - is idempotent (a retry with the same idempotency key returns the same result; a second reversal with a new key is rejected);
   - is **final**: a reversal cannot itself be reversed in Release 1, and reversal chains are not introduced (a wrongly reversed transaction is corrected by recording a new transaction);
   - requires a **reason**: free text, required, maximum 500 characters, stored on the reversal transaction and shown in history;
   - must never produce a negative balance in any currency. Reversing an earning that has already been spent is refused until the dependent redemption is reversed first. Reversing a redemption restores its deducted balance.
9. **Abuse protection.** Idempotency keys, positive and precision-validated amounts, and a **warning with explicit merchant confirmation** when the same customer was already awarded at the same business within the previous **10 minutes**. The warning requires explicit merchant confirmation to proceed; a close repeat purchase is legitimate, so it is never blocked automatically. No default per-transaction or points cap is imposed; server-side limits apply only when a merchant-configurable limit exists.
10. **Transaction limits.** The `limits.maxPerTransaction` setting read by the existing earning code is not part of the programme configuration DTOs or the merchant programme UI and is unreachable. It is removed from 6B-C scope.
11. **Expiry.** No expiry enforcement in Release 1. `stampExpirationDays` and `pointsExpirationDays` remain accepted but unenforced; optional reward expiry from PRODUCT.md is deferred.
12. **Branch.** A branch is recorded on a transaction when the business has more than one branch; membership and programme remain business-level (Decision 13).
13. **Explicitly not in 6B-C.** Manual stamp/point issuance, email confirmation of transactions, customer-initiated redemption, reward codes/inventory, expiry, configurable transaction limits, reversal chains.
14. **Earning-rate snapshot (required).** The database does **not** guarantee that a programme configuration is immutable (verified, see below), so the earning rate is not derived from the referenced configuration alone. Each earning entry stores an explicit snapshot of the rule applied: for points, the integer earning rate in hundredths of a point per TND; for stamps, the fixed rule of one stamp. The `program_configurations.id` reference is kept as well. Where the snapshot is stored (entry or header) is settled in the implementation plan.
15. **Programme-version immutability finding (verified against migrations 0005-0011 and `programs.service.ts`).**
    - *Present:* application code only `INSERT`s into `program_configurations`; a new version creates new rows; `updateProgram` changes only programme name and description; `deleteProgram` deletes configurations only when no ledger entry references them; the foreign key `loyalty_activity_entries.program_configuration_id` is `ON DELETE RESTRICT`; RLS on `program_configurations` defines only `SELECT` and `INSERT` policies (not relied on, because the local application role has `BYPASSRLS`).
    - *Absent:* no trigger or privilege restriction prevents an `UPDATE` of `program_configurations.settings` (unlike the ledger tables, which have append-only triggers).
    - *Conclusion:* immutability is an application convention, not a database guarantee. A database-level immutability guard could be added as complementary hardening; whether to add it is left to the implementation plan and does not remove the snapshot requirement of rule 14.

**Rationale:** Stamps replace paper cards, so the counter flow stays one tap; recording the amount preserves transaction information without complicating stamps. Integer millimes avoid rounding drift. Owner-only operation means correction needs an audit trail rather than a time limit; the append-only ledger already enforces exact full reversal.

**Alternatives rejected:** stamps proportional to amount; a `rewards` table and one-time reward codes; a 24-hour reversal window; automatic time-based blocking of repeat scans; default points/transaction caps; two-decimal currency storage.

**Status:** APPROVED (rules). Backend implemented 2026-11-21 (see evidence below); migrations 0012-0014 applied to the local Docker database 2026-11-21; frontend pending.

**Implementation settled (2026-11-21, approved plan):** rate snapshot on `loyalty_activity_entries.earning_rate_hundredths` (points earnings only); `redemption` enum value in its own migration (0012); header columns `purchase_amount_millimes` and `reversal_reason` (0013); UPDATE-rejecting trigger on `program_configurations` (0014); rewards identified by `{ configurationId, rewardIndex }` and re-read server-side; `purchasesPerStamp` optional and ignored for earning (no rows rewritten, no versions created); `branchId` required only when the business has more than one branch.

**Existing behaviour before 6B-C (historical, replaced 2026-11-21)** - `backend/src/features/merchants/merchant-transaction.service.ts`, `merchants.controller.ts` (`customers/resolve-for-transaction`, `transactions/calculate-earnings`, `transactions`, `transactions/redeem-reward`), `backend/src/features/loyalty/customer-balance.service.ts`, `frontend/src/features/loyalty/scanner/`:
- Earning uses one reused `purchaseAmount` field: stamps = `floor(amount / purchasesPerStamp)` (treating the amount as a visit count) and points = `floor(amount x pointsPerCurrencyUnit)` in floating point. Both conflict with rules 2, 3 and 5.
- The amount is used only for the calculation and is not persisted on the ledger.
- Redemption queries a `rewards` table that no migration creates, so it always fails with "Reward not found"; if it succeeded it would record `manual_adjustment`.
- `CustomerBalanceService.redeemReward` (customer-initiated) is not routed to any controller.
- The ledger supports full reversal (Decision 14) but no route exposes it; no reason is stored.
- Expiry fields are stored but unenforced.
- No unit or integration tests were found for the transaction/redemption service or its endpoints.

**Schema changes required (written as migrations 0012-0014 on 2026-11-21; applied to the local Docker database the same day):**
- `loyalty_transactions`: add nullable `purchase_amount_millimes bigint` (>= 0 when present; business rule requires it for points programmes).
- `loyalty_transactions`: add a reversal reason text column (<= 500 characters), required when `category = 'reversal'` and null otherwise.
- `loyalty_transaction_category`: add `redemption`.
- Explicit earning-rate snapshot stored with each earning (rule 14); storage location to be settled in the implementation plan.
- Reward thresholds and rates are read from the versioned programme settings; no new table.

**Implementation dependencies and risks:** reversal route and history screen; replacing the amount/stamp logic and the floating-point points calculation; removing reliance on the missing `rewards` table; handling existing programmes that store `purchasesPerStamp`; migration or handling of active configurations that still store `purchasesPerStamp` (new programme version only); tests for earning, redemption and reversal (mandatory critical path per AGENTS.md).

**Evidence:** `backend/src/shared/money/index.ts`, `backend/src/features/loyalty/earning-calculator.ts`, `backend/src/features/loyalty/loyalty-ledger.service.ts`, `backend/src/features/merchants/merchant-transaction.service.ts`, migrations `0012`-`0014`; unit specs `test/unit/money.spec.ts`, `earning-calculator.spec.ts`, `loyalty-ledger.service.spec.ts`, `merchant-transaction.service.spec.ts` (pass); `test/merchant-transaction.integration.spec.ts` written, not run (migrations 0012-0014 are applied locally; RLS not provable locally).

---

### 16. Release 1 Customer Phone Identity: OTP Verification Deferred

**Decision:** In Release 1 a customer's phone number is a **unique identifier**, not verified phone ownership. Both **customer self-registration** and **merchant-assisted registration** are supported. **OTP verification is deferred to Release 2.** Successful OTP verification is not a Release 1 registration or sign-in requirement, and no Release 1 behaviour may assume the phone number is verified.

**Supersedes in Release 1:** the OTP wording of Decisions #4 and #6 and the Change Log entry of 2026-11-01. Those describe the Better Auth Phone Number plugin and SMS provider integration, which remain the intended Release 2 verification path; selecting an SMS vendor (#6, V1) no longer blocks Release 1.

**Implementation evidence:** migration `0010_phone_unverified_provisioning.sql` (customer accounts provisioned with `phone_verified = false`), `POST /auth/phone/sign-in` (phone number only), `register-customer.dto.ts` and `merchant-customer-registration.service.ts` (merchant-assisted registration).

**Consequence:** phone ownership is not proven in Release 1; this is an accepted scope limitation until OTP is delivered in Release 2.

**Status:** APPROVED

---

### 17. Frontend Stack: React 19 and In-Repo UI Components

**Date:** 2026-11-21 (verified against `frontend/package.json`, `frontend/src/components/ui`, commit `cd0aa31`)

**Decision:** The frontend uses React 19, Vite, TypeScript, Tailwind CSS 4, Redux Toolkit and React Router 7. UI is built from in-repo primitives under `frontend/src/components/ui` plus `lucide-react`, `clsx` and `tailwind-merge`. shadcn/ui dependencies were removed in commit `cd0aa31`; shadcn/ui is not part of the current implementation.

**Supersedes:** the React 18 version in #1 and the shadcn/ui choice in #10. Both remain above as history.

**Status:** APPROVED (user, 2026-11-21)

---

### 18. Database Environments: Docker PostgreSQL Locally, Neon for Deployment

**Date:** 2026-11-21 (verified against `docker-compose.yml`; the repository contains no Supabase code or configuration)

**Decision:** Local development uses Docker Compose PostgreSQL 16 (`postgres:16-alpine`, service `postgres`). Neon is the planned deployment database. Supabase is not part of the current architecture. Only standard PostgreSQL features are used.

**Supersedes:** the Supabase development references in #3 and pending validation V3. No Neon-specific code or configuration exists yet.

**Status:** APPROVED (user, 2026-11-21)

---

### 19. Release 1 Business Model: No Billing Enforcement

**Date:** 2026-11-21

**Decision:** Release 1 has no billing, subscription enforcement or plan limits, and transactions are cash-based. Future SaaS monetization is not ruled out; it is deferred and unspecified.

**Supersedes:** the "subscription-based per-merchant; freemium" business-model line formerly in `PRODUCT.md`.

**Status:** APPROVED (user, 2026-11-21)

---

### 20. Re-displayable Personal QR and Manual Short ID

**Date:** 2026-11-22

**Decision:** The customer can see the same personal QR again, and a merchant can type a short ID when scanning fails.
1. **Derivation:** `credential = base64url(HMAC-SHA256(CUSTOMER_QR_SECRET, "fideliy:customer-qr:v1:" + customerAccountId + ":" + credentialRowId))` (32 bytes, 43 characters). The credential row id is generated explicitly (`randomUUID()`) and inserted explicitly; rotation inserts a new row (new id) and revokes the old one. There is no version counter.
2. **Storage and merchant resolution unchanged:** only `sha256(credential)` is stored in `credential_hash`; the merchant lookup by hash is unchanged. The credential is never stored.
3. **GET returns the current credential:** `GET /customers/personal-qr` returns `{ issuedAt, active: true, credential, shortCode }`, derived from the active row and verified in constant time against the stored hash. A mismatch (legacy random credential, or changed key) returns `credential: null, shortCode: null, requiresRotation: true`. Legacy credentials are not migrated: they keep resolving until the customer rotates once. Responses of GET, issue and rotate carry `Cache-Control: no-store`. Supersedes the "returned only once; status metadata only" part of #14 item 1.
4. **Key:** `CUSTOMER_QR_SECRET` (hex or base64, at least 32 bytes) is a deployment secret separate from `BETTER_AUTH_SECRET`. Startup requires it in production only; elsewhere issue, rotate and GET fail with a clear error. An attacker holding the key and the database identifiers (customer account id, credential row id) can forge every active QR. Key compromise: replace the key and revoke all active credentials (documented only; no bulk-revoke script exists). Replacing the key without revoking makes every GET report `requiresRotation`, and old QRs keep resolving by hash.
5. **Short ID:** derived from the same key with the label `fideliy:customer-qr-short:v1:` (same inputs), the first 10 characters (50 bits) in Crockford base32 (no I, L, O, U), shown as `XXXXX-XXXXX`. It changes whenever the QR is rotated. Only its SHA-256 (of the normalised 10 characters) is stored in nullable `customer_qr_credentials.short_code_hash` with a partial unique index over active rows; legacy rows have NULL until rotated. Input is normalised (uppercase, dashes and spaces stripped, O to 0, I and L to 1).
6. **Merchant resolve:** `qrCredential` (resolve-for-transaction) and `credential` (resolve-qr) accept either the 43-character credential or the short ID, told apart by format. Membership checks and 404/409 behaviour are unchanged; unknown and malformed codes both give 404. No request field was renamed.
7. **Open risk (not mitigated):** a 50-bit short ID is enumerable by an authenticated merchant. The only throttler (`RateLimitService`, in-memory, fixed 10 attempts per 10 minutes per key, used by phone sign-in) is not suited to this route and was not applied; no new subsystem was added. A DB leak also allows offline enumeration of 50-bit short ID hashes. A per-merchant limit on resolve attempts is needed before wide production use.

**Status:** APPROVED (user, 2026-11-22); implemented.

---

### 21. Scanning a Personal QR Enrols the Customer (amends #15 rule 1 and #20 item 6)

**Date:** 2026-11-22

**Decision:**
1. When a merchant validates a customer's personal QR (43-character credential or short ID) through `resolve-for-transaction`, an existing customer who is not a member of the merchant's business is enrolled as an active member. This replaces the 409 "must join first" and the 409 "membership not active" of that route.
2. An inactive membership is reactivated on the same row (`status='active'`, `left_at=NULL`, `joined_at` unchanged) and a `joined` lifecycle event is appended. A new enrolment inserts one row and one `joined` event. An active member causes no write. All of it is idempotent.
3. The "card" is the business-level `customer_business_memberships` row plus the ledger-computed balance. No new table and no zero-delta ledger row.
4. The business must have an active programme: otherwise 404 and nothing is written (checked before any write). Unknown or malformed codes: 404, no write.
5. `resolve-qr` stays a pure lookup. Earn, redeem and preview still require an active membership. The response gains `membership.enrolment` (`existing | joined | rejoined`); the scanner shows a notice when it is not `existing`.
6. **Accepted risk:** short IDs enrol too, and no per-merchant rate limit exists (see #20 item 7). A merchant who guesses a valid short ID can enrol that customer (and see their name and phone) without any customer action. A per-merchant limit is needed before wide production use.
7. **Recorded gap (RLS):** merchant-side INSERT/UPDATE policies on `customer_business_memberships` and `membership_lifecycle_events`, and non-member credential lookup, do not exist under RLS. This works locally only because the local role has `BYPASSRLS`; production under a non-bypass role needs a migration that was not made here.
8. Customer-visible effect: the customer's membership list gains the business without a customer action; there is no customer notification in Release 1.

**Status:** APPROVED (user, 2026-11-22); implemented.

---

## PROPOSED DECISIONS (Awaiting Confirmation)

### P1: Eight-Module NestJS Architecture

**Proposed:** Use 8 modules as designed:
- auth
- customers
- merchants
- programs
- loyalty (with sub-modules: earning, redemption, balances)
- admin
- shared
- database

**Rationale:** Clear separation of concerns; feature-based organization

**Status:** 🔄 **PROPOSED**

**Requires User Confirmation:** Yes

---

### P2: NestJS Guards for Role-Based Access Control

**Proposed:** Use `@UseGuards(CustomerGuard)` and `@UseGuards(MerchantGuard)` decorators on endpoints.

**Rationale:** Enforces role-based access; fails fast; better than middleware

**Example:**
```typescript
@Get('/profile')
@UseGuards(CustomerGuard)
async getProfile(@Session() session) { ... }
```

**Status:** 🔄 **PROPOSED**

**Requires User Confirmation:** Yes

---

### P3: Zod for Request Validation

**Proposed:** Use Zod for runtime request validation (DTO validation).

**Rationale:** TypeScript-native; runtime checks; better error messages than class-validator

**Example:**
```typescript
const createCustomerSchema = z.object({
  phoneNumber: z.string().regex(/^\+216\d{8}$/)
})
```

**Status:** 🔄 **PROPOSED**

**Requires User Confirmation:** Yes

---

## PENDING VALIDATION

### V1: SMS Provider for Tunisia +216

**Status:** ⏳ **PENDING**

**Task:** Phase 1A research — contact Twilio, Vonage, Infobip

**Impact:** Blocks Phase 1B SMS integration

**Timeline:** Select by end of Week 4 (Phase 1A)

---

### V2: Production Hosting Platform

**Status:** ⏳ **PENDING**

**Candidates:**
- Render
- Railway
- Fly.io
- AWS/GCP/Azure

**Criteria:**
- PostgreSQL-friendly
- Node.js support
- Cost-effective for startup
- Good DX and documentation

**Timeline:** Evaluate during Phase 1A; finalize by Phase 1F

---

### V3: Supabase → Neon Migration Timing

> **Resolved (2026-11-21):** Supabase is not the current architecture; local Docker PostgreSQL and planned Neon deployment are recorded in #18.

**Status:** ⏳ **PENDING**

**Question:** Migrate production database to Neon immediately post-launch (Phase 2A) or keep on Supabase indefinitely?

**Considerations:**
- Supabase: Integrated auth (unused), free tier, easy admin UI
- Neon: Serverless, auto-scaling, cost-effective at high volume

**Timeline:** Decide during Phase 1F; plan migration for Phase 2B if chosen

---

## DEFERRED DECISIONS (Phase 2+)

### D1: Multi-Manager Support

**Deferred Feature:** Multiple users per merchant account with role-based access.

**Reason:** Release 1 scope limited to single merchant per account

**Timeline:** Phase 2B (weeks 25+)

---

### D2: Delegated Permissions

**Deferred Feature:** Cashier, manager, owner roles for merchant staff.

**Reason:** Release 1 limited to merchant owner

**Timeline:** Phase 2B

---

### D3: Connection Pooling (PgBouncer)

**Deferred:** Shared connection pooling layer

**Reason:** Single NestJS instance initially; not needed until horizontal scaling

**Timeline:** Phase 2C (after scale requirements validated)

---

### D4: Redis Caching Layer

**Deferred:** Cache for frequently accessed data (program info, balances)

**Reason:** Database performance sufficient for Release 1 scale

**Timeline:** Phase 2C (performance optimization phase)

---

### D5: Advanced Analytics

**Deferred Feature:** Customer lifetime value, churn prediction, program ROI

**Reason:** Release 1 limited to basic metrics

**Timeline:** Phase 2B+

---

### D6: NFC Card Scanning

**Deferred Feature:** Physical NFC cards for customers

**Reason:** QR codes sufficient for Release 1; adds hardware complexity

**Timeline:** Phase 3

---

### D7: Public API

**Deferred Feature:** Third-party integrations (POS systems, e-commerce)

**Reason:** Release 1 internal use only

**Timeline:** Phase 3

---

### D8: Mobile Apps

**Deferred Feature:** Native iOS/Android applications

**Reason:** Web-responsive PWA sufficient for Release 1

**Timeline:** Phase 3+

---

## Decision Change Log

### 2026-11-01: Better Auth Phone OTP Implementation

> **Superseded for Release 1 by Decision #16:** OTP verification is deferred to Release 2.

**Previous Decision:** Custom phone OTP implementation required (Better Auth Phone Number plugin not available)

**Updated Decision:** Use official Better Auth Phone Number plugin (production-ready, maintained)

**Reason:** Better Auth published Phone Number plugin (official); reduces implementation risk; vendor support available

**Impact:** Simplifies Phase 1A and Phase 1B; reduces development time; improves maintainability

**Related:** See #4 (Authentication decision)

---

## Summary

| Category | Count | Details |
|----------|-------|---------|
| APPROVED | 11 | Tech stack, architecture, guards, RLS, transactions, UI |
| PROPOSED | 3 | Module structure, guard usage, Zod validation |
| PENDING | 3 | SMS vendor, hosting platform, migration timing |
| DEFERRED | 8 | Multi-manager, analytics, NFC, API, mobile apps, pooling, caching, delegated access |

**Next Steps:**
1. User confirms PROPOSED decisions (P1, P2, P3)
2. Phase 1A begins SMS vendor research (V1)
3. Phase 1A selects hosting platform (V2)
4. All APPROVED decisions locked for Release 1


---

## PHASE 2 COMPLETION DECISIONS

### 21. Device-Based Logo Upload: Validation Logic (Onboarding Acceptance)

**Decision:** Update onboarding completion validation to accept either `logo_url` OR `logo_storage_key` as valid logo sources.

**Rationale:**
- Phase 2 implementation adds device-based logo storage alongside existing URL-based logos
- Merchants should be able to use either logo type for onboarding
- Backward-compatible: existing URL logos continue to work unchanged
- Validation logic: `if (!urlLogo && !deviceLogo) missing.push('business.logo')`

**Alternatives:**
- Make device-based logo required (rejected: breaks backward compatibility)
- Keep logo optional (rejected: contradicts product requirement for business identity)
- Require both logo types (rejected: unnecessary friction for merchants)

**Status:** ✅ **APPROVED & IMPLEMENTED**

**Evidence:**
- Integration test: `should accept completion with valid device-based logo` ✅ PASS
- Integration test: `should accept completion with valid URL-based logo` ✅ PASS
- Integration test: `should handle businesses with both URL and device-based logos` ✅ PASS
- Code: `src/features/merchants/business-setup.service.ts` lines 349-352

**Implementation Details:**
```typescript
const hasUrlLogo = row.logo_url?.trim();
const hasDeviceLogo = row.logo_storage_key;
if (!hasUrlLogo && !hasDeviceLogo) missing.push('business.logo');
```

---

### 22. Device-Based Logo: Database Migration Strategy

**Decision:** Create additive migration `0009_device_based_logo.sql` adding 6 columns to `businesses` table.

**Rationale:**
- Additive-only migration strategy (Phase 1 principle): safer, no data loss risk
- New columns support device-based logo metadata (storage key, filename, dimensions, MIME type, upload timestamp)
- Creates index on `logo_storage_key` for efficient lookup
- Applied automatically on `DatabaseService.onModuleInit()`

**Alternatives:**
- Alter existing `logo_url` column (rejected: breaks backward compatibility)
- Create separate `logos` table (rejected: adds unnecessary complexity)
- Manual migration step (rejected: automatic on app start is better DX)

**Status:** ✅ **APPROVED & IMPLEMENTED**

**Evidence:**
- Migration file: `src/database/migrations/0009_device_based_logo.sql`
- Registered in: `src/database/migrations/meta/_journal.json` (idx: 9)
- Applied automatically: `DatabaseService.onModuleInit()` calls `migrate()`
- Schema updated successfully: Database tests confirm column exists ✅

---

### 23. Customer Logo Retrieval: Feature Deferral

**Decision:** Defer implementation of public customer-facing logo retrieval endpoint to Phase 3.

**Rationale:**
- `docs/PRODUCT.md` Release 1 scope does not specify device-based logo visibility for customers
- URL-based logos already returned via merchant discovery endpoint
- Feature is customer-facing enhancement, not core onboarding requirement
- Phase 3 planning required to define scope (public endpoint vs. authenticated vs. RLS-protected)

**Alternatives:**
- Implement public endpoint now (rejected: out-of-scope per product spec)
- Make logo visibility part of onboarding (rejected: adds complexity to Phase 2)
- Assume customer visibility (rejected: violates "never invent requirements" principle)

**Status:** ⏳ **DEFERRED TO PHASE 3**

**Decision Record:** `docs/PHASE_2_LOGO_RETRIEVAL_ANALYSIS.md` (artifact)

**Phase 3 Task:** "Define customer logo visibility requirements and implement narrowly-scoped endpoint if authorized by product"

---

### 24. Test Environment: Rate Limiting Disabled

**Decision:** Disable Better Auth rate limiting in test environment via `NODE_ENV=test` condition.

**Rationale:**
- Integration tests create multiple merchant accounts via `/auth/sign-up/email` rapidly
- Better Auth rate limit (100 req/15 min) triggers false positives in test suite (429 responses)
- Test environment should not enforce production-like constraints
- Zero impact on production (NODE_ENV=production or unset defaults to rate limiting enabled)

**Alternatives:**
- Add delays between test merchant registrations (rejected: increases test runtime by 4x with no guarantee)
- Reuse single merchant for multiple tests (rejected: tight coupling, harder to debug)
- Increase rate limit globally (rejected: would weaken production security)

**Status:** ✅ **APPROVED & IMPLEMENTED**

**Evidence:**
- Implementation: `src/features/auth/better-auth.config.ts` line 196: `enabled: process.env.NODE_ENV !== 'test'`
- Setup: `backend/jest.config.js` sets `process.env.NODE_ENV = 'test'`
- Result: All 9 integration tests pass; no rate limiting in CI/CD

---

### 25. TypeScript Configuration: ES Module Support

**Decision:** Update `tsconfig.json` to `"module": "esnext"` and `"moduleResolution": "node"` for ES module support.

**Rationale:**
- `import.meta` needed for file path resolution in ESM
- `DatabaseService` uses `import.meta.url` for migrations path
- Drizzle ORM requires ESM path resolution

**Alternatives:**
- Use `__dirname` polyfill (rejected: deprecated pattern, ESM is standard)
- Stick with CommonJS (rejected: blocks ESM features; Drizzle expects ESM)

**Status:** ✅ **APPROVED & IMPLEMENTED**

**Evidence:**
- Config: `backend/tsconfig.json` (module: esnext, moduleResolution: node)
- TypeScript build: 0 errors ✅
- Backend tests: All pass ✅

---

## SUMMARY: Phase 2 Integration Complete

**All 5 Phase 2 decisions approved and implemented.**
**9/9 integration tests passing.**
**0 breaking changes.**
**Backward compatibility verified.**

**Next Phase:** Phase 3 - Loyalty transactions and redemption flow.
