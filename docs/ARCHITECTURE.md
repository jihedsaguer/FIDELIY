# Architecture & System Design

## 1. System Overview

FIDELIY is organized as a modular monolith with clear separation between frontend (React), backend (NestJS), and database (PostgreSQL with Drizzle ORM). All components are stateless to enable horizontal scaling.

### High-Level Diagram

```
┌────────────────────────────┐
│   Customer/Merchant UI     │
│ (React 19 + Vite)          │
└──────────────┬─────────────┘
               │ REST API
┌──────────────▼─────────────┐
│  Backend (NestJS Monolith) │
│  - Auth Module             │
│  - Customers Module        │
│  - Merchants Module        │
│  - Programs Module         │
│  - Loyalty Module          │
│  - Admin Module            │
└──────────────┬─────────────┘
               │ SQL + RLS
┌──────────────▼─────────────┐
│   PostgreSQL Database      │
│ (Docker 16 dev, Neon 18)   │
└─────────────────────────────┘
```

## 2. Technology Rationale

### Frontend: React 19 + Vite + TypeScript
- **Why:** Modern, fast build tool (Vite), strong TypeScript support, large ecosystem
- **Alternatives Considered:** Vue (smaller, but less enterprise adoption), Next.js (rejected: adds server-side complexity; we use stateless backend)
- **Choice:** React + Vite provides best DX for SPAbased UI

### Backend: NestJS Modular Monolith
- **Why:** Strong TypeScript support, built-in DI/middleware, clear module structure, good for Release 1 scale
- **Alternatives Considered:** Express (too minimal), Django/Spring (different language ecosystem)
- **Choice:** NestJS provides structure without unnecessary microservices complexity

### Database: PostgreSQL + Drizzle ORM
- **Why:** ACID transactions for loyalty integrity, RLS for multi-tenancy, Drizzle portability between providers
- **PostgreSQL Rationale:** Relational model matches domain; ACID ensures transaction integrity; RLS provides native multi-tenant isolation
- **Drizzle Rationale:** Full TypeScript support, SQL-like API, zero abstraction overhead, portable across standard PostgreSQL hosts (local Docker, Neon)
- **Alternatives Considered:** Prisma (less control, harder to debug complex queries), MongoDB (no RLS, ACID is harder)
- **Choice:** Postgres + Drizzle + pg driver (node-postgres) for development; Neon HTTP driver available for serverless

### Authentication: Better Auth with Phone Number Plugin + Email/Password
- **Release 1 scope (DECISIONS #16):** customer phone numbers are unique identifiers and are not OTP-verified; OTP/SMS verification is deferred to Release 2. The OTP details below describe the Release 2 verification path.
- **Why:** Official plugin for phone OTP (production-ready), framework-agnostic, extensible
- **Phone OTP:** Better Auth Phone Number plugin with custom SMS provider integration (sendOTP callback)
- **Merchant Email:** Better Auth email/password provider with email verification
- **Account Separation:** Single Better Auth instance on `users`; capabilities come from the `customer_accounts` and `merchant_accounts` tables; role-based guards in NestJS
- **Alternatives Considered:** Firebase (vendor lock-in), Auth0 (expensive), custom auth (risky, time-consuming)
- **Choice:** Better Auth balances simplicity, security, and extensibility

### Email: Resend
- **Why:** Simple transactional email API, good DX, supports React email templates
- **Alternatives Considered:** SendGrid (more features, overkill for MVP), AWS SES (complex setup)
- **Choice:** Resend for straightforward transactional email

### SMS Provider: TBD (Pending Tunisia +216 Validation)
- **Candidates:** Twilio, Vonage, Infobip (specifics pending vendor confirmation for Tunisia)
- **Integration:** Via Better Auth Phone Number plugin's `sendOTP` callback
- **Choice:** Pending Phase 1A vendor research

## 3. NestJS Backend Module Structure

The repository is aligned to a feature-owned backend structure under `backend/src/features`. Shared infrastructure remains in `backend/src/shared`, while the database layer continues to live under `backend/src/database` until a dedicated schema decomposition checkpoint is approved.

**Feature folders (8):**

1. **auth** — Better Auth integration, phone OTP setup, email/password setup
   - Responsible for: Session management, phone verification, email verification
   - Exports: Session validation, auth service, session service
   - Does not: Business logic (kept in domain features)

2. **customers** — Customer account management
   - Responsible for: Customer profile, phone verification status, membership access
   - Exports: Customer controller and module
   - Does not: Loyalty logic (kept in loyalty feature)

3. **merchants** — Merchant account and business management
   - Responsible for: Merchant profile, business management, branch management
   - Exports: Merchant controller and module
   - Does not: Program management (kept in programs feature)
   - Business setup API: `GET /merchants/business-setup`, idempotent `POST /merchants/business-setup/business` and `POST /merchants/business-setup/first-branch`, owner-scoped `PATCH` operations on those setup resources, and `POST /merchants/business-setup/complete`
   - Setup ownership is derived from the validated session user and `merchant_accounts`; every business/branch query uses `TenantContextService`
   - Completion requires business name, business phone, an explicitly selected phone-visibility preference, either a logo URL or a stored device-uploaded logo, both theme colors, and the first branch name and address
   - The setup API supports device-based logo upload and owner-scoped retrieval; it does not add additional branch-management UI or loyalty transaction operations. Business-level programme configuration is implemented in Checkpoint 6A
   - Tenant context is applied, but the current local PostgreSQL role bypasses RLS; production tenant isolation is not yet verified

4. **programs** — Loyalty program configuration
   - Responsible for: Program creation, rule configuration, program updates
   - Exports: Programs module
   - Does not: Transaction processing (kept in loyalty feature)

5. **loyalty** — Core transaction processing
   - Responsible: Earning transactions, redemption processing, balance management
   - Exports: Loyalty module
   - Does not: Program configuration (kept in programs feature)

6. **admin** — Platform administration
   - Responsible for: Merchant onboarding, system health, audit logs
   - Does not: Domain logic

7. **shared** — Shared utilities, guards, error handling
   - Responsible for: NestJS guards (CustomerGuard, MerchantGuard), error handling, database utilities, RLS context setup
   - Exports: Guard decorators, middleware, database helpers
   - Does not: Domain logic

8. **database** — Current Drizzle schema, migrations, configuration
   - Responsible for: Existing table definitions, migration history, runtime DB connection
   - Exports: schema and Drizzle helpers
   - Does not: Business logic

**Important constraint:** The repo still uses the existing centralized Drizzle schema entry point. Schema ownership by feature directory is a planned structural follow-up that is intentionally not implemented in this checkpoint.

#### Merchant business setup contract

| Method and route | Request | Behavior |
| --- | --- | --- |
| `GET /merchants/business-setup` | None | Returns the authenticated merchant's setup status, business, and branches. `business` includes `publicQrId` (the id in the public join URL `/qr/:qrId`), which the merchant "My business QR" page (`/merchant/business-qr`) uses; `business` is `null` before setup. |
| `POST /merchants/business-setup/business` | `{ "name": string }` | Creates the initial business. A retry returns the existing business without creating another. |
| `PATCH /merchants/business-setup/business` | Partial business fields: `name`, `description`, `businessPhone`, `phonePubliclyDisplayed`, `logoUrl`, `theme` | Updates only the authenticated merchant's business. `theme` uses `{ "primaryColor": "#RRGGBB", "accentColor": "#RRGGBB" }`; nullable optional branding/contact fields may be cleared. |
| `POST /merchants/business-setup/first-branch` | `{ "name": string, "address": string }` | Creates the first branch. Retries return that existing branch. |
| `PATCH /merchants/business-setup/first-branch` | Partial first-branch fields: `name`, `address`, `phone` | Updates the earliest branch selected for onboarding. |
| `POST /merchants/business-setup/complete` | None | Persists completion only if all required business and first-branch fields are valid; otherwise returns HTTP 400 with `missingFields`. |

The setup response is `{ status, business, branches }`. `status` is `required` with `business: null` when no business exists, `in_progress` until validated completion, and `complete` afterward. `phonePubliclyDisplayed` defaults to false; `phoneVisibilityConfigured` separately reports whether the merchant explicitly chose true or false. Mutations never accept a merchant or owner ID from the client.

#### Programme management contract (`/programs`)

Verified by reading `programs.controller.ts`, `programs.service.ts`, the DTOs and migration 0011 (not by running the API). All routes use `MerchantGuard`; the business is derived from the session user, never from the client; every query runs through `TenantContextService`. `GET /programs/current` and `/history` are declared before `/:programId`.

| Route | Body | Behaviour |
| --- | --- | --- |
| `GET /programs/current` | none | Active programme, or `null` when none exists (the empty-body HTTP rendering of `null` was not re-tested). |
| `GET /programs/history` | none | All versions, newest first. |
| `GET /programs` | none | `{ programs, total }`. |
| `GET /programs/:programId` | none | One programme of the business; 404 if not found. |
| `POST /programs` | `{ type, configurations, name?, description? }` | Creates version 1. 409 if an active programme exists. |
| `POST /programs/versions` | same | Deactivates the active programme and inserts `version + 1`. 404 if none is active. |
| `POST /programs/enhanced` | structured DTO (below) | Creates the initial programme when none is active, otherwise a new version; never returns 409. |
| `PATCH /programs/:programId` | `{ name?, description? }` | Updates metadata only; 404 if not found. The body type is inline and unvalidated. |
| `PATCH /programs/:programId/deactivate` | none | `{ success, message }`; 404 unless the programme is active. |
| `DELETE /programs/:programId` | none | Only inactive programmes; 404 otherwise; 409 if any ledger entry references its configurations. Deletes configurations, then the programme. |

- **Types:** `type` is `stamps | points | both`; `status` is `active | inactive`.
- **Original format validation:** `configurations` must be a plain object containing exactly one plain-object entry per enabled type; otherwise 400.
- **Enhanced DTO:** `name` (max 255), `description` (max 1000), `type`, `stamps`, `points`. Stamps: `earningRule { purchasesPerStamp (optional int, min 1; deprecated and ignored for earning by DECISIONS #15), description (max 500) }`, `rewardThresholds [{ stampsRequired (int, min 1), name (required, max 255), description (max 1000), isActive }]`, `stampExpirationDays` (int, min 1, or null). Points: `earningRule { pointsPerCurrencyUnit (min 0.01, max 2 decimals), currencyCode (max 3), description }`, `rewardThresholds [{ pointsRequired (int, min 1), ... }]`, `pointsExpirationDays`. Stamps are required for `stamps`/`both`; points for `points`/`both`.
- **Response:** `{ id, businessId, name, description, type, version, status, activatedAt, deactivatedAt, createdAt, configurations: { stamps: {}, points: {} } }`; `name` and `description` are nullable.
- **Rules:** one active programme per business; new rules create a new version and never rewrite history; deletion is refused once loyalty activity exists.
- **Superseded defects:** an archived 2026-11 verification reported missing `name`/`description` columns, a `FOR UPDATE` aggregate error on delete, and array-vs-object `configurations`. Current source has the columns (migration 0011), no such query, and one response mapper.

#### Frontend structure

Verified from `frontend/src` (React 19 + Vite SPA, not Next.js):

- `app/`: `store.ts`, `hooks.ts`, `providers.tsx`, `routes/{index.tsx,paths.ts,RouteGuards.tsx}` (lazy routes, central paths, session and capability guards)
- `services/api/baseApi.ts`: RTK Query `createApi` with cookie credentials against `VITE_API_BASE_URL` (default `/api`, proxied to the backend by Vite); feature APIs inject endpoints into it
- `components/ui`: shared primitives; `components/layout`: `AppLayout`, `PublicLayout`, `Sidebar`
- `features/`: `auth`, `business-onboarding`, `customer`, `loyalty` (scanner, public QR landing), `merchant` (dashboard, programmes, branches, profile, settings; `features/merchants` is an empty duplicate directory)
- `shared/i18n` (French and Arabic), `lib/utils.ts` (`cn`), `styles/`, `test-utils/`
- Onboarding step state stays local to its page; server state lives in RTK Query.

Conventions: feature folders `kebab-case`, component files `PascalCase.tsx`. Design conventions are in `docs/DESIGN_SYSTEM.md`.

## 4. Authentication & Authorization Architecture

### Single Better Auth Instance (No Separate Identity System)

> Release 1 customer sign-in is phone-only (`POST /auth/phone/sign-in`, no OTP; DECISIONS #16). The snippet below shows the Release 2 OTP path.

```typescript
// auth.ts
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, ctx) => {
        // Call SMS provider (pending vendor selection)
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@fideliy.local`,
      }
    })
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }, ctx) => {
      // Send via Resend
    }
  }
})
```

### Account Type Separation (Global Identity + Capabilities)

**Database Schema:**
```
users (global identity)
├─ id: UUID (PK)
├─ email: varchar (optional, for recovery)
├─ phoneNumber: varchar (optional, for customer OTP)
└─ createdAt: timestamp

customer_accounts (capability)
├─ id: UUID (PK)
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ phoneVerified: boolean
└─ joinedAt: timestamp

merchant_accounts (capability)
├─ id: UUID (PK)
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ emailVerified: boolean
└─ registeredAt: timestamp
```

**Multi-Capability Support:**
- One person can be BOTH customer AND merchant
- Table membership determines capabilities (not a userType field)
- Example: User 123 has customer_accounts (earn rewards) + merchant_accounts (manage program)

**NestJS Guards (Role-Based Access Control):**

```typescript
// CustomerGuard
- Checks: customer_accounts record exists for user
- Does not check phone verification in Release 1 (DECISIONS #16)
- Enforces: RLS context for customer tenant

// MerchantGuard
- Checks: merchant_accounts record exists for user
- Checks the capability record only
- Enforces: RLS context for merchant tenant
```

**No Account Type Immutability:**
- Simpler than userType enum
- Extensible: Add third account type (e.g., admin) by creating admin_accounts table
- One user can have multiple capabilities without schema migration

**Better Auth Session:**
- Session tied to `users.id`
- Guards check account table membership per request
- No "role switching" UI needed; users access what they have accounts for

## 5. Multi-Tenancy via PostgreSQL RLS

Isolation uses a transaction-local setting, not Supabase-style `auth.uid()`. `TenantContextService.executeWithContext` (`backend/src/shared/database/tenant-context.service.ts`) runs `set_config('app.user_id', userId, true)` inside the transaction, and policies compare `current_setting('app.user_id')::uuid`. The policy pattern, isolation levels and the local `BYPASSRLS` caveat are in `docs/DATABASE.md` section 4. CustomerGuard and MerchantGuard provide the application-layer check; database-level isolation is not yet verified as effective (the local role bypasses RLS).

## 6. Transaction Integrity and Loyalty Ledger Foundation (Checkpoint 6B-B)

### 6.1 Internal Loyalty Ledger
Loyalty activity is recorded in an immutable, append-only ledger (`loyalty_transactions` and `loyalty_activity_entries`):
- **Transaction Headers:** Represent discrete loyalty activity events (purchase, manual adjustment, reversal). Bound to the business, customer membership, acting merchant account, and optional branch.
- **Typed Signed Entries:** Store signed integer deltas (stamps, points) referencing exact `program_configurations.id` rows to preserve history across program version updates.
- **Append-Only Triggers:** Database triggers (`reject_loyalty_ledger_mutation`) reject any `UPDATE` or `DELETE` statements on ledger records.
- **Reversal Relationships:** Linked full compensating transactions referencing original headers and entries. Database partial unique indexes enforce at most one reversal per original transaction and at most one reversal per activity entry; the service validates full entry set coverage and exact inverse delta matching (`delta = -original.delta`).
- **Internal Service Boundary:** `LoyaltyLedgerService` has no routes of its own; since Checkpoint 6B-C the merchant transaction routes (section 6.5) write through it.

### 6.2 Serializable Isolation and Concurrency
- `TenantContextService.executeWithContext` supports configurable isolation levels (`read committed`, `serializable`, `repeatable read`).
- Ledger operations run at `serializable` isolation with row locks (`FOR SHARE` on business/branch/configurations, `FOR UPDATE` on memberships).
- **Bounded Retry:** Transient concurrency failures (PostgreSQL serialization failure `40001` and deadlock `40P01`) are automatically retried up to 3 times with fresh connections; non-retryable errors and exhausted retries fail fast and preserve original errors.

### 6.3 Business-Scoped Idempotency & Fingerprinting
- Scoped by `(business_id, idempotency_key)` unique constraint so different businesses never collide.
- Payload fingerprinting computes a deterministic SHA-256 digest over canonicalized request fields (excluding the key itself, with sorted entry lists).
- Same key + same fingerprint returns the original outcome.
- Same key + different fingerprint returns `409 ConflictException`.

### 6.4 Secure Customer QR Credential Lifecycle
Rules: DECISIONS #20 (supersedes the return-once part of #14).
- Credential derived, not random: `base64url(HMAC-SHA256(CUSTOMER_QR_SECRET, "fideliy:customer-qr:v1:" + customerAccountId + ":" + credentialRowId))` (43 characters). Short ID: same key, label `fideliy:customer-qr-short:v1:`, first 10 characters in Crockford base32, shown `XXXXX-XXXXX`. Helper: `backend/src/shared/security/customer-qr.ts`, used by customer issue/rotate, public join and merchant-assisted registration.
- Stored exclusively as SHA-256 hex digests (`credential_hash`, `short_code_hash`); neither value is stored.
- `GET /customers/personal-qr` returns `{ issuedAt, active: true, credential, shortCode }`, or `credential: null, shortCode: null, requiresRotation: true` for a legacy credential (hash mismatch); 404 when none. `POST /customers/personal-qr` (409 if active) and `POST /customers/personal-qr/rotate` return `{ credential, shortCode, issuedAt }`. All three send `Cache-Control: no-store`. Registration responses (`POST /merchants/customers/register`, public join) add `personalQrShortCode` next to `personalQrCredential` (new customers only).
- Rotation inserts a new row (new id, so new credential and short ID) and revokes the old one.
- Merchant resolution (`POST /merchants/customers/resolve-qr` with `credential`, `POST /merchants/customers/resolve-for-transaction` with `qrCredential`) accepts the 43-character credential or the short ID (normalised), looks up the matching hash column, unknown and malformed codes both return 404. `resolve-qr` is a pure lookup (membership status is reported, nothing is written); `resolve-for-transaction` enrols (DECISIONS #21): after the programme check it inserts an active membership (or reactivates an inactive one in place) and a `joined` lifecycle event, idempotently.
- `CUSTOMER_QR_SECRET` is required in production (checked at startup in `main.ts`); never log or return it.

#### Customer membership responses (`/customers/memberships`)
`GET /customers/memberships` (list) and `GET /customers/memberships/:id` (detail, which adds `lifecycle`) return `{ id, status, joinedAt, leftAt, business: { name, logoUrl }, program: { type, version } | null, balance: { stamps, points }, rewards: [{ name, activityType, cost }] }`. `balance` is the ledger sum for that membership and business (`LoyaltyLedgerService.getBalance`); `rewards` lists the active reward thresholds of the active programme's configurations (`listRewards`; inactive or malformed thresholds omitted; `[]` when the business has no active programme). Additive change, no migration; join/leave responses use the same shape. The customer loyalty card renders its progress from these fields only.

### 6.5 Merchant Transaction API (Checkpoint 6B-C, backend; migrations 0012-0014 applied to the local Docker database 2026-11-21)
Rules: DECISIONS #15. All routes use `MerchantGuard`; the business is always derived from the session user. Amounts are TND decimal strings (`^\d+(\.\d{1,3})?$`, > 0), stored as integer millimes (`backend/src/shared/money`). Earning math lives in `backend/src/features/loyalty/earning-calculator.ts`; writes go through `LoyaltyLedgerService` (serializable), which also verifies non-negative balances and the repeat warning.

| Route | Body / query | Behaviour |
| --- | --- | --- |
| `POST /merchants/customers/resolve-for-transaction` | `{ qrCredential }` (`branchId` accepted, unused) | Customer, membership `{ id, status, joinedAt, enrolment: 'existing' \| 'joined' \| 'rejoined' }` (enrols the customer when needed; 404 with no write when the business has no active programme), balance, `program { id, type, version, name, configurations { stamps?: { configurationId }, points?: { configurationId, earningRate } } }`, `rewards [{ configurationId, rewardIndex, name, activityType, cost, available }]` read from the stored `rewardThresholds` (a threshold with `isActive: false` is omitted). |
| `POST /merchants/transactions/calculate-earnings` | `{ membershipId, purchaseAmount? }` | Preview only (no longer called by the scanner UI, which records directly via `POST /merchants/transactions`): `{ purchaseAmount, stampsToEarn, pointsToEarn, earningRate, totalStampsAfter, totalPointsAfter }`. |
| `POST /merchants/transactions` | `{ membershipId, purchaseAmount?, branchId?, idempotencyKey, confirmRepeat? }` | One stamp per purchase (no `purchasesPerStamp`); points `floor(millimes x rateHundredths / 100000)`, amount required when the programme includes points. 409 `{ code: 'RECENT_EARNING_CONFIRMATION_REQUIRED' }` if the membership had a non-reversed purchase in the last 10 minutes and `confirmRepeat` is not `true`. Response `{ transactionId, membershipId, purchaseAmount, stampsEarned, pointsEarned, earningRate, newBalance, occurredAt (stored), idempotencyKey }`. |
| `POST /merchants/transactions/redeem-reward` | `{ membershipId, configurationId, rewardIndex, branchId?, idempotencyKey }` | Cost re-read from the stored configuration of the business's active programme; deducted in that configuration's currency; surplus kept; 409 `Insufficient balance for this reward`; category `redemption`. |
| `POST /merchants/transactions/:transactionId/reverse` | `{ reason (1-500), idempotencyKey }` | Full, once, final; 404 for another business's transaction; 400 for reversing a reversal; 409 for a second reversal or when reversing an already spent earning (reverse the redemption first). |
| `GET /merchants/transactions` | `?membershipId=` (optional) | Newest first, at most 100: `{ transactions [{ id, membershipId, branchId, category, occurredAt, purchaseAmount, reversalReason, reversesTransactionId, reversedByTransactionId, stampsDelta, pointsDelta, entries [{ activityType, delta, programConfigurationId, earningRate }] }], summary? }`. `summary` is added only with `membershipId` (additive): `{ stamps, points: { earned, earningsReversed, redeemed, redemptionsReversed, adjustments, balance }, transactionCount, programType \| null, rewards [{ configurationId, rewardIndex, name, activityType, cost }] }`. Totals are computed in SQL over ALL ledger entries of the membership scoped by `business_id` (not just the 100 listed); each reversal counts under the category of the transaction it reverses (`earningsReversed`, `redemptionsReversed` positive amounts; a reversed adjustment folds into `adjustments`); `balance = earned - earningsReversed - redeemed + redemptionsReversed + adjustments` = the ledger sum. `rewards` come from the active programme configurations (same shape as resolve, without `available`). No pagination: the UI shows a "latest 100" note when `transactionCount > 100`. |
| `GET /merchants/customers` | `?search=` (name or phone, case-insensitive, LIKE wildcards escaped, <= 100 chars), `?status=active\|inactive`, `?limit=` (default 25, max 100), `?offset=` | `{ items [{ membershipId, customer { name, phoneNumber }, status, joinedAt, leftAt, balance { stamps, points }, lastActivityAt \| null }], total }`. `MerchantGuard`; the business is the session merchant's (never a parameter; 404 when none). Ordered `joined_at DESC, id`. Balance is the ledger sum, `lastActivityAt` is the newest ledger transaction of the membership. Read-only; runs inside `TenantContextService.executeWithContext`. Needs migration `0016` under enforced RLS (DATABASE.md section 4). Frontend: `MerchantCustomersPage` (table from `md`, cards below), history in a modal through `GET /merchants/transactions?membershipId=`. |

- `branchId` is required on earning and redemption when the business has more than one branch.
- Idempotency fingerprint covers amount, reversal reason and the points rate snapshot; `confirmRepeat` is excluded, so a retry with the same key returns the stored transaction.
- The frontend scanner (`frontend/src/features/loyalty/scanner/`) uses these shapes since Slice B (2026-11-22): decimal-string amounts, `RECENT_EARNING_CONFIRMATION_REQUIRED` confirmation, reward picker by `{ configurationId, rewardIndex }`, branch picker, per-customer history and reversal with a required reason. Verified by frontend tests against a stubbed `fetch`, not against the real backend.

## 7. Deployment & Scaling

### Stateless Backend
- No session storage in memory
- All state in PostgreSQL (via Better Auth)
- Horizontal scaling: Deploy multiple NestJS instances behind load balancer

### Release 1 Deployment (DECISIONS #22; setup in README "Deployment")
- Browser -> Cloudflare Worker `fideliy` (workers.dev): serves the SPA (assets with SPA fallback) and proxies `/api/*` to the backend (`frontend/worker/index.ts`), so the browser sees one origin and Better Auth cookies stay first-party. `BETTER_AUTH_URL` and `FRONTEND_URL` are both the Worker URL.
- Backend: one Render free web service from `backend/Dockerfile` (`runtime` stage), health check `GET /api/health`; sleeps when idle; local logo storage is ephemeral there.
- Database: Neon PostgreSQL 18; the app uses the pooled connection string, migrations the direct one.
- Pipeline: GitHub Actions `CI` then `Deploy` on push to `main` (migrate -> Render -> Worker -> smoke checks); no staging, no PR previews.
- Smoke/pilot only: the Neon owner role is not subject to RLS (DATABASE.md section 4), so no real tenant data until RLS hardening.

### Database Connection Pooling
- One `pg` pool per NestJS instance (10 s connection timeout for Neon cold starts), connected through Neon's pooled endpoint in production
- A separate PgBouncer layer is a Phase 2 consideration

## 8. Known Architectural Constraints & Trade-Offs

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| Single monolith (no microservices) | Harder to scale individual services | Phase 2: Extract services if needed |
| Phone number as primary customer ID | Phone changes require account migration | Rare operation; handled via update flow |
| RLS at DB level only | Application layer also needs guards | Defense-in-depth approach; both layers enforced |
| Docker PostgreSQL 16 locally, Neon PostgreSQL 18 deployed (CI on 18) | Neon behaviour (pooling, cold start, roles) not yet exercised by a real deployment; the Neon owner role is not subject to RLS | Standard PostgreSQL only; smoke/pilot data only until RLS hardening (DECISIONS #18, #22) |

## 9. Risks & Mitigation

| Risk | Mitigation | Status |
|------|-----------|--------|
| SMS provider for Tunisia unavailable | Contact vendors now; fallback to email OTP if needed | PENDING |
| Multi-tenant data leakage | RLS policies + application guards + comprehensive tests | APPROVED |
| Double-spending in loyalty | Atomic transactions + pessimistic locking + tests | APPROVED |
| Drizzle learning curve | Team ramp-up during Phase 1A | APPROVED |
| Better Auth Phone plugin instability | Official plugin (production-ready); vendor support available | APPROVED |

## 10. Pending Architecture Decisions

- **Hosting Platform:** resolved: Render (backend) + Cloudflare Worker (frontend), DECISIONS #22
- **Connection Pooling:** PgBouncer implementation strategy (Phase 2 consideration)
- **Caching Layer:** Redis for performance optimization (Phase 2 consideration)
