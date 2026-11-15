# Architecture & System Design

## 1. System Overview

FIDELIY is organized as a modular monolith with clear separation between frontend (React), backend (NestJS), and database (PostgreSQL with Drizzle ORM). All components are stateless to enable horizontal scaling.

### High-Level Diagram

```
┌────────────────────────────┐
│   Customer/Merchant UI     │
│ (React + Vite + shadcn/ui) │
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
│ (Supabase dev, Neon prod)  │
└─────────────────────────────┘
```

## 2. Technology Rationale

### Frontend: React 18 + Vite + TypeScript
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
- **Drizzle Rationale:** Full TypeScript support, SQL-like API, zero abstraction overhead, portable between Supabase and Neon
- **Alternatives Considered:** Prisma (less control, harder to debug complex queries), MongoDB (no RLS, ACID is harder)
- **Choice:** Postgres + Drizzle + pg driver (node-postgres) for development; Neon HTTP driver available for serverless

### Authentication: Better Auth with Phone Number Plugin + Email/Password
- **Why:** Official plugin for phone OTP (production-ready), framework-agnostic, extensible
- **Phone OTP:** Better Auth Phone Number plugin with custom SMS provider integration (sendOTP callback)
- **Merchant Email:** Better Auth email/password provider with email verification
- **Account Separation:** Single Better Auth instance with immutable `user.userType` field; role-based guards in NestJS
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
| `GET /merchants/business-setup` | None | Returns the authenticated merchant's setup status, business, and branches. |
| `POST /merchants/business-setup/business` | `{ "name": string }` | Creates the initial business. A retry returns the existing business without creating another. |
| `PATCH /merchants/business-setup/business` | Partial business fields: `name`, `description`, `businessPhone`, `phonePubliclyDisplayed`, `logoUrl`, `theme` | Updates only the authenticated merchant's business. `theme` uses `{ "primaryColor": "#RRGGBB", "accentColor": "#RRGGBB" }`; nullable optional branding/contact fields may be cleared. |
| `POST /merchants/business-setup/first-branch` | `{ "name": string, "address": string }` | Creates the first branch. Retries return that existing branch. |
| `PATCH /merchants/business-setup/first-branch` | Partial first-branch fields: `name`, `address`, `phone` | Updates the earliest branch selected for onboarding. |
| `POST /merchants/business-setup/complete` | None | Persists completion only if all required business and first-branch fields are valid; otherwise returns HTTP 400 with `missingFields`. |

The setup response is `{ status, business, branches }`. `status` is `required` with `business: null` when no business exists, `in_progress` until validated completion, and `complete` afterward. `phonePubliclyDisplayed` defaults to false; `phoneVisibilityConfigured` separately reports whether the merchant explicitly chose true or false. Mutations never accept a merchant or owner ID from the client.

## 4. Authentication & Authorization Architecture

### Single Better Auth Instance (No Separate Identity System)

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
- Validates: Phone verification status
- Enforces: RLS context for customer tenant

// MerchantGuard
- Checks: merchant_accounts record exists for user
- Validates: Email verification status
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

**Row-Level Security Policies:**

```sql
-- All tables with merchant tenant:
CREATE POLICY merchant_isolation
ON transactions
FOR SELECT
TO authenticated
USING (
  (SELECT user_type FROM users WHERE id = auth.uid()) = 'merchant'
  AND business_id IN (SELECT business_id FROM merchants WHERE user_id = auth.uid())
)

-- All tables with customer tenant:
CREATE POLICY customer_isolation
ON enrollments
FOR SELECT
TO authenticated
USING (
  (SELECT user_type FROM users WHERE id = auth.uid()) = 'customer'
  AND customer_id = (SELECT id FROM customers WHERE user_id = auth.uid())
)
```

**RLS Context Setup (NestJS):**
```typescript
// In shared/database/rls.service.ts
await db.execute(sql`SET rls.current_user_id = ${userId}`)
await db.execute(sql`SET rls.current_user_type = ${userType}`)
```

## 6. Transaction Integrity and Loyalty Ledger Foundation (Checkpoint 6B-B)

### 6.1 Internal Loyalty Ledger
Loyalty activity is recorded in an immutable, append-only ledger (`loyalty_transactions` and `loyalty_activity_entries`):
- **Transaction Headers:** Represent discrete loyalty activity events (purchase, manual adjustment, reversal). Bound to the business, customer membership, acting merchant account, and optional branch.
- **Typed Signed Entries:** Store signed integer deltas (stamps, points) referencing exact `program_configurations.id` rows to preserve history across program version updates.
- **Append-Only Triggers:** Database triggers (`reject_loyalty_ledger_mutation`) reject any `UPDATE` or `DELETE` statements on ledger records.
- **Reversal Relationships:** Linked full compensating transactions referencing original headers and entries. Database partial unique indexes enforce at most one reversal per original transaction and at most one reversal per activity entry; the service validates full entry set coverage and exact inverse delta matching (`delta = -original.delta`).
- **Internal Service Boundary:** `LoyaltyLedgerService` is strictly an internal service foundation; no client-facing or merchant-facing write routes exist in Checkpoint 6B-B.

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
- Credentials generated as cryptographically strong 32-byte base64url tokens (43 characters).
- Raw secret returned **only once** upon initial issuance or rotation.
- Stored exclusively as 64-character SHA-256 hex digests (`credential_hash`).
- Customer retrieval returns status metadata (`{ issuedAt, active: true }`), never secrets or hashes.
- Merchant resolution (`POST /merchants/customers/resolve-qr`) hashes the presented token, performs index lookup, and verifies active business membership without exposing credentials.

## 7. Deployment & Scaling

### Stateless Backend
- No session storage in memory
- All state in PostgreSQL (via Better Auth)
- Horizontal scaling: Deploy multiple NestJS instances behind load balancer

### Database Connection Pooling
- PgBouncer for connection pooling (Phase 2 consideration)
- Development: Single connection pool per NestJS instance
- Production: Shared connection pool across instances

### Frontend Deployment
- Cloudflare Pages for static hosting (Phase 1A consideration)
- Automatic CDN for assets
- Previews for PR testing

## 8. Known Architectural Constraints & Trade-Offs

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| Single monolith (no microservices) | Harder to scale individual services | Phase 2: Extract services if needed |
| Phone number as primary customer ID | Phone changes require account migration | Rare operation; handled via update flow |
| Immutable userType | Cannot convert customer to merchant | User requirement; separate accounts if needed |
| RLS at DB level only | Application layer also needs guards | Defense-in-depth approach; both layers enforced |
| Supabase for development | Later migration to Neon needed | Drizzle abstracts DB; migration tested in Phase 1A |

## 9. Risks & Mitigation

| Risk | Mitigation | Status |
|------|-----------|--------|
| SMS provider for Tunisia unavailable | Contact vendors now; fallback to email OTP if needed | PENDING |
| Multi-tenant data leakage | RLS policies + application guards + comprehensive tests | APPROVED |
| Double-spending in loyalty | Atomic transactions + pessimistic locking + tests | APPROVED |
| Drizzle learning curve | Team ramp-up during Phase 1A | APPROVED |
| Better Auth Phone plugin instability | Official plugin (production-ready); vendor support available | APPROVED |

## 10. Pending Architecture Decisions

- **Hosting Platform:** Render vs Railway vs other (Phase 1A decision)
- **Connection Pooling:** PgBouncer implementation strategy (Phase 2 consideration)
- **Caching Layer:** Redis for performance optimization (Phase 2 consideration)
