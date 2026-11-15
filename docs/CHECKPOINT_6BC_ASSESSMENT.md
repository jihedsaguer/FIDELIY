# FIDELIY Checkpoint 6B-C Assessment

**Date:** November 2026
**Status:** Initial Assessment — Before Implementation
**Scope:** Product refinements (logo upload, local customer testing) + architecture improvements + 6B-C preparation

---

## 1. Current Repository State

### Git Status
- **Branch:** main
- **Uncommitted changes:** 53 modified files, 28 deleted, 30 new files (untracked)
- **Status:** Active work in progress
- **Policy:** No commits; preserve all changes for user approval

### Existing Implementation Checkpoints (Complete)

#### ✅ Checkpoint 6A: Program Configuration
- Versioned stamps/points program selection
- Program lifecycle management (active/inactive)
- Migration 0005 applied: `programs` and `program_configurations` tables
- Backend integration tests passing
- Frontend onboarding guides merchants through programme setup
- **Note:** No earning/balance logic; configuration-only

#### ✅ Checkpoint 6B-A: Customer Memberships & QR Credentials  
- Business-scoped customer membership lifecycle (`customer_business_memberships`)
- One-time QR credential secret issuance/rotation
- Migration 0006 applied: membership tables and lifecycle tracking
- Backend integration tests passing
- **Note:** QR resolution for merchants implemented; no balance/earning logic

#### ✅ Checkpoint 6B-B: Internal Loyalty Ledger Foundation
- Immutable append-only transaction headers and signed entries
- Business-scoped idempotency with SHA-256 fingerprinting
- Serializable isolation with bounded retry logic (40001, 40P01 PostgreSQL errors)
- Full reversal integrity with duplicate prevention and inverse delta enforcement
- Migrations 0007, 0008 applied: ledger tables, append-only triggers, RLS
- Unit and PostgreSQL integration tests passing
- **Critical Constraint:** `BYPASSRLS` on local application role; RLS not enforced for testing
- **Note:** Internal service only; no client-facing earning/redemption endpoints

### Architecture State

#### Backend (NestJS Modular Monolith)
**Structure:**
```
backend/src/
├── features/
│   ├── auth/              ✅ Better Auth integration, OTP config, session management
│   ├── customers/         ✅ Customer profiles, memberships, QR lifecycle
│   ├── merchants/         ✅ Business setup, branch management, customer resolution
│   ├── programs/          ✅ Program config, versioning, activation
│   ├── loyalty/           ✅ Ledger foundation, reversal integrity (service-internal)
│   └── admin/             ⏳ Scaffolding only
├── shared/
│   ├── database/          ✅ RLS context, tenant isolation, connection retry logic
│   ├── guards/            ✅ CustomerGuard, MerchantGuard capability enforcement
│   ├── middleware/        ✅ Session validation middleware
│   ├── security/          ⏳ Security utilities
│   └── test-utils/        ✅ Test fixtures and helpers
└── database/
    ├── schema.ts          ✅ Drizzle ORM definitions for all tables
    └── migrations/        ✅ 8 forward-only migrations applied
```

**Status:**
- Better Auth v1.7.18 integrated with phone OTP + email/password
- Merchant business setup contract fully implemented and tested
- Guided five-step onboarding complete
- Customer discovery and membership join working
- Personal QR credentials generated and hashed (SHA-256)
- Merchant QR resolution endpoint for customer lookup
- All existing tests passing (84 unit, 6 integration, 28 frontend)

**Unimplemented (Out of Scope for Checkpoints 6A-6B-B):**
- Device-based logo upload (URL-based input only)
- Stamp/point earning formulas
- Balance calculations and projections
- Reward thresholds and redemption
- Customer dashboard showing balances/rewards
- Merchant interfaces for purchase entry and redemption
- Email notifications for transactions

#### Frontend (React + Vite)
**Structure:**
```
frontend/src/
├── features/
│   ├── auth/                    ✅ Phone OTP, email/password signup/signin
│   ├── business-onboarding/     ✅ Five-step resumable merchant setup flow
│   ├── merchant/                ⏳ Merchant dashboard (scaffolding)
│   ├── customer/                ⏳ Customer dashboard (scaffolding)
│   └── merchants/               (Legacy, consolidating into merchant)
├── services/                    ✅ API client, auth context
├── components/                  ✅ Shared UI components
└── styles/                      ✅ Global styling
```

**Status:**
- Auth flows (phone OTP, email/password) working
- Merchant onboarding flow complete, responsive, and resumable
- Redux-like auth context for session management
- API client with bearer token support
- Tests for auth flows and onboarding (28 passing)
- Production build successful

**Not Implemented:**
- Customer dashboard
- Merchant dashboard (purchase entry, customer view, rewards)
- Balance/transaction display
- Logo upload UI
- Email verification UI (scaffolded)

#### Database
**Schema (8 tables from migrations 0001-0008):**
```
users                         → Better Auth global identity
userAccount, userSession      → Better Auth session management
customer_accounts             → Customer capability
merchant_accounts             → Merchant capability
businesses, branches          → Merchant-owned locations
customer_business_memberships → Business-scoped customer enrollment
customer_qr_credentials       → Personal QR secrets (SHA-256 hashed)
programmes, program_configs   → Loyalty programme versions
loyalty_transactions          → Immutable earning/redemption headers
loyalty_activity_entries      → Signed stamp/point deltas
```

**Status:**
- All migrations applied to local PostgreSQL
- RLS policies defined (not enforced due to BYPASSRLS)
- Append-only triggers on ledger tables prevent modification
- Partial unique indexes enforce reversal integrity
- Forward-only migration strategy intact
- No schema resets or volume recreation

---

## 2. Gap Analysis: What's Missing for Checkpoint 6B-C Preparation

### Part 1: Product Refinement A — Device-Based Logo Upload
**Gap:**  Current logo input is URL-based; no file upload capability exists.

**Required Implementation:**
1. Storage provider abstraction (interface/port pattern)
2. Local filesystem storage adapter with Docker volume support
3. Image validation, compression, and processing
4. Backend file upload endpoint
5. Integration with existing business setup flow
6. Frontend file selection and preview UI
7. Logo metadata persistence (path, filename, dimensions)

**Files to Create/Modify:**
- `backend/src/shared/storage/` — Storage provider interface and adapters
- `backend/src/features/merchants/logo-upload.service.ts` — Upload business logic
- `backend/src/features/merchants/merchants.controller.ts` — File upload endpoint
- `frontend/src/features/business-onboarding/logo-upload-step.tsx` — File UI
- Database migration for logo metadata columns

**Not Yet Started**

### Part 2: Product Refinement B — Local Verified Customer
**Gap:** SMS provider not selected; can't test customer signup without live SMS.

**Required Implementation:**
1. Local development-only test customer fixture (deterministic, pre-provisioned)
2. Safe dev-only auth helper (not a production bypass)
3. Phone verification state properly set in `customer_accounts`
4. Valid Better Auth session creation for test customer
5. Personal QR credential issued
6. Integration tests for full customer pipeline (auth → membership → QR)
7. Browser-level test accessing React customer UI

**Files to Create/Modify:**
- `backend/src/test-utils/local-test-customer.ts` — Fixture provisioning
- `backend/src/features/auth/local-dev-auth.service.ts` — Dev-only helper (guarded)
- `backend/test/end-to-end/customer-pipeline.e2e.spec.ts` — Full flow test
- `frontend/src/test-utils/e2e-helpers.ts` — Browser test utilities
- Environment variable: `ENABLE_LOCAL_TEST_AUTH=true`

**Not Yet Started**

### Part 3: Architecture Refinement C — Provider Boundaries
**Gap:**  SMS, storage, and email not yet abstracted from domain logic.

**Current State:**
- Better Auth Phone plugin uses mock SMS (`sendOTP` callback logs to console)
- No storage abstraction; nowhere to upload yet
- Resend email integration exists but not separated into adapters
- No event/async handler pattern documented

**Required Improvements:**
1. SMS provider interface in `backend/src/shared/sms/`
2. Implement mock SMS adapter (development)
3. Implement placeholder for real vendor (TBD)
4. Storage provider interface in `backend/src/shared/storage/`
5. Filesystem adapter with Docker volume mapping
6. Document event patterns for async workflows (email notifications)
7. Keep domain features decoupled from provider specifics

**Status:** Scoped; not comprehensive refactoring

**Not Yet Started**

### Part 4: 6B-C Product Specification (Checkpoint Preparation)
**Gap:** Stamp earning rules and reward thresholds not yet decided.

**Required Outputs (Documents Only, No Implementation):**
1. **Stamp earning rules decision document**
   - One stamp per purchase vs. spending-based?
   - Multiple stamps per transaction?
   - Fractional handling?
   - Manual adjustment policy?
   - Duplicate/retry behavior?

2. **Reward thresholds and redemption rules document**
   - How many stamps = reward?
   - Multiple reward tiers?
   - Reward types?
   - Partial redemption?
   - Merchant confirmation flow?
   - Concurrent redemption handling?

3. **Reversal effects analysis**
   - How reversals affect earned stamps, balances, redeemed rewards
   - Preserve append-only ledger model
   - Full reversal (no partial)

4. **Technical design for 6B-C**
   - Which services to extend (LoyaltyLedgerService, MerchantCustomerService)
   - New services/tables truly needed vs. existing
   - Customer balance retrieval
   - Idempotency strategy
   - Testing approach

**Not Yet Started** — User approval required before implementation

---

## 3. Proposed Execution Sequence

### Phase 1: Architecture Assessment (Current)
✅ Document existing implementation state
⏳ Identify gaps and dependencies

### Phase 2: Logo Upload Implementation
- [ ] Create storage provider abstraction
- [ ] Implement local filesystem adapter
- [ ] Add image validation and compression
- [ ] Create backend file upload endpoint
- [ ] Integrate with business setup flow
- [ ] Add frontend UI and preview
- [ ] Run tests and verify

### Phase 3: Local Customer Provisioning
- [ ] Create test customer fixture
- [ ] Implement dev-only auth helper (fail-closed in production)
- [ ] Provision phone verification state
- [ ] Generate personal QR credential
- [ ] Add integration tests for full pipeline
- [ ] Add browser-level UI test
- [ ] Verify customer React interface works

### Phase 4: Architecture Improvements (Targeted)
- [ ] Extract SMS provider interface
- [ ] Extract storage provider interface (if not done in Phase 2)
- [ ] Document event/async patterns
- [ ] Improve boundaries between domain and providers

### Phase 5: 6B-C Product Specification
- [ ] Prepare stamp earning decision options
- [ ] Prepare reward threshold options
- [ ] Analyze reversal effects
- [ ] Design technical implementation for 6B-C
- [ ] Present to user for approval

### Phase 6: 6B-C Implementation (After User Approval)
- [ ] Implement stamp earning formulas (user-approved)
- [ ] Implement reward thresholds and redemption
- [ ] Integrate with ledger and customer balance views
- [ ] Customer and merchant UIs for earning/redemption

---

## 4. Identified Risks & Constraints

### Technical Risks
1. **Image Processing Library:** No heavy dependencies currently; need to validate if sharp/imagemin is justified
2. **Storage Strategy:** Docker volume must persist across container recreation; mount path must be stable
3. **Customer Testing:** Better Auth Phone plugin functionality depends on database being available; local OTP bypass must fail closed in production
4. **BYPASSRLS:** Current local application role bypasses RLS; production isolation not yet verified (out of scope for this checkpoint)

### Product Risks
1. **Logo Upload Scope:** Just image upload or also logo management/replacement?
2. **SMS Provider:** Still pending for Tunisia; blocks real customer testing until selected
3. **Stamp Earning Rules:** Multiple viable options exist; user decision required before implementation
4. **Balance Calculation:** Not defined; needed before customer dashboard shows balances

### Scope Risks
1. **Email Notifications:** Mentioned in product spec but not implemented; not part of current refinements
2. **Merchant/Customer Dashboards:** Scaffolded but non-functional; stamp earning depends on these
3. **Partial Reversals:** Must preserve full-reversal model; user must confirm no partial-reversal requests

---

## 5. Files Currently Modified (Git Status Summary)

### Backend Changes (Modified/New)
- Core: `app.module.ts`, `main.ts`, `jest.config.js`, `package.json`, `tsconfig.json`
- Features: auth, customers, merchants, programs, loyalty, admin (feature-based restructure)
- Shared: database, guards, middleware, security, test-utils
- Database: schema, 8 migrations (0001-0008), meta
- Tests: unit tests, integration tests, PoC tests

### Frontend Changes (Modified/New)
- Core: `main.tsx`, `vite.config.ts`, `package.json`
- Features: auth, business-onboarding, merchant, customer, merchants
- Services, components, styles, tests

### Documentation Changes
- `AGENTS.md` — Updated guidelines
- `README.md` — Updated stack and status
- `docs/ARCHITECTURE.md` — Detailed module structure and RLS design
- `docs/DATABASE.md` — Schema, migrations, ledger design
- `docs/DECISIONS.md` — 7 approved decisions documented
- `docs/ROADMAP.md` — Canonical roadmap with test evidence
- New: `docs/PROJECT_STRUCTURE.md` (if exists), `docs/CHECKPOINT_6BC_ASSESSMENT.md` (this file)

### Docker/Config
- `docker-compose.yml` — Updated configuration
- New: `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` files

---

## 6. Build & Test Status

### Build
- Backend TypeScript: ✅ Pass
- Frontend TypeScript: ✅ Pass  
- Frontend Vite: ✅ Pass

### Tests (Backend)
- Unit tests: 84 passing
- Integration tests (6B-A, 6B-B): 6 passing (requires `RUN_*_INTEGRATION=true`)
- Skipped: 36 (DB-backed or conditional)
- **Command:** `npm test --prefix backend`

### Tests (Frontend)
- Component tests: 28 passing
- **Command:** `npm test --prefix frontend`

### Database
- PostgreSQL: ✅ Running in Docker (`fideliy-postgres`)
- Migrations: ✅ Applied (0001-0008)
- RLS Policies: ✅ Created (not enforced due to BYPASSRLS)
- Forward-only strategy: ✅ Maintained

---

## 7. Next Steps (Awaiting Approval)

1. **Confirm the proposed sequence** for Phases 2-5
2. **Approve logo upload design** (scope, UI, file limits)
3. **Approve local test customer approach** (dev-only auth boundaries)
4. **Clarify stamp earning options** before technical spec in Phase 5

---

## Appendix: Quick Reference

### Key Files to Monitor
- **Auth:** `backend/src/features/auth/`
- **Merchants:** `backend/src/features/merchants/business-setup.service.ts`
- **Customers:** `backend/src/features/customers/customer-membership.service.ts`
- **Loyalty Ledger:** `backend/src/features/loyalty/loyalty-ledger.service.ts`
- **RLS Context:** `backend/src/shared/database/tenant-context.service.ts`
- **Onboarding UI:** `frontend/src/features/business-onboarding/`

### Environment
- Database: PostgreSQL (Supabase dev or local)
- Backend: NestJS on Node.js, runs in Docker or locally
- Frontend: React 18 + Vite
- Better Auth: v1.7.18

### Related Docs
- `docs/PRODUCT.md` — Release 1 scope and features
- `docs/ARCHITECTURE.md` — System design and module structure
- `docs/DATABASE.md` — Schema details and migrations
- `docs/DECISIONS.md` — Architectural rationale
- `AGENTS.md` — Development guidelines for this project
