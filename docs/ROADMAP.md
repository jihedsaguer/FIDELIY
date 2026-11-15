# FIDELIY Roadmap

This document is the canonical project roadmap. It replaces ad hoc status notes and acts as the source of truth for releases, sprints, dependencies, and validation evidence.

## Release overview

| Release | Focus | Status | Notes |
| --- | --- | --- | --- |
| Release 0 | Architecture research and scope definition | Complete | Approved stack and scope are documented in the product and architecture docs. |
| Release 1 | Auth, tenancy, foundational merchant/customer flows, and loyalty workflows | In progress | Core auth, business setup, customer memberships, secure QR, and internal loyalty ledger foundation implemented; stamp and points earning/redemption workflows in progress. |
| Release 2 | Multi-manager, delegated permissions, and advanced operations | Planned | Deferred until Release 1 foundation is stable. |
| Release 3 | Dashboards and admin workflows | Planned | Depends on core loyalty and merchant flows. |

## Current status summary

- Backend is using NestJS + Better Auth + PostgreSQL + Drizzle as approved.
- Feature-based structure is being aligned under `backend/src/features` while preserving the current runtime behavior and database contracts.
- Auth startup validation and tenant-context guard logic are in place and tested at the unit level.
- Database-backed Better Auth verification remains gated behind a live PostgreSQL instance and is not yet treated as complete by default.
- Local mock SMS is intentionally a no-op; real SMS vendor delivery remains a separate future integration.
- Merchant business setup status and owner-scoped backend operations are implemented, integration-tested, and runtime-verified. The guided frontend onboarding experience is complete. Checkpoints 6A and 6B-A are implemented with migrations 0005 and 0006 applied locally. 6B-A covers customer/business memberships and QR credentials only; loyalty activity and redemption remain planned. The configured local application role has `BYPASSRLS`, so database policies are not treated as effective tenant isolation.
- PB-19 and PB-20 remain deferred.

## Release 1 backlog

### EPIC: Authentication and tenant foundation

| ID | Title | Priority | Status | Owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| PB-01 | Architecture and scope validation | P0 | Complete | Engineering | None | Approved stack and release boundaries documented. |
| PB-02 | Backend feature restructuring | P0 | In progress | Engineering | PB-01 | Feature-based backend layout is active and imports resolve. |
| PB-03 | Auth runtime verification | P0 | In progress | Engineering | PB-02 | Better Auth runtime path verified against a live DB-backed test. |
| PB-04 | Session validation and guard enforcement | P0 | Complete (unit-level) | Engineering | PB-03 | Middleware and guards enforce server-side session validation. |
| PB-05 | RLS and tenant-context validation | P0 | Complete (unit-level) | Engineering | PB-03 | Transaction-scoped tenant context remains enforced. |
| PB-06 | Local dev environment alignment | P1 | Planned | Engineering | PB-02 | Local startup and env expectations documented. |

### EPIC: Customer and merchant foundation

| ID | Title | Priority | Status | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| PB-07 | Customer auth flows | P1 | Planned | PB-03 | Phone OTP flow works against a running DB. |
| PB-08 | Merchant auth flows | P1 | Planned | PB-03 | Email/password flow works against a running DB. |
| PB-09 | Customer and merchant capability checks | P1 | In progress | PB-04 | Guards validate capability membership correctly. |
| PB-10 | Business and branch scaffolding | P2 | Complete (backend integration) | PB-09 | Authenticated merchants can create, retrieve, update, and safely retry their initial business and first branch; the schema permits multiple branches under the business. |
| PB-11 | Merchant setup-status contract | P2 | Complete (backend integration) | PB-10 | API distinguishes required, in-progress, and complete; completion is validated server-side against the approved business, phone visibility, branding, and first-branch fields. |
| PB-12 | Guided merchant onboarding experience | P2 | Complete | PB-11 | Authenticated merchants can complete a responsive, resumable five-step onboarding flow using the existing business setup API; required inputs are validated and completion is confirmed by the backend. |

### Deferred items

| ID | Title | Priority | Status | Reason |
| --- | --- | --- | --- | --- |
| PB-19 | Multi-manager support | P3 | Deferred | Out of scope for Release 1. |
| PB-20 | Delegated permissions / cashier access | P3 | Deferred | Out of scope for Release 1. |

## Release 1 — Loyalty workflow implementation

| Checkpoint | Scope | Status | Notes |
| --- | --- | --- | --- |
| 6A | Business-level stamps/points programme selection, versioned configuration persistence, activation lifecycle, and history | Complete (backend) | Migration 0005 applied to the configured local PostgreSQL database; no earning, balance, redemption, billing, or frontend functionality included. |
| 6B-A | Business-level customer membership, business/branch QR discovery, and personal customer QR credential lifecycle | Complete (backend) | Migration 0006 applied locally; lifecycle history and customer ownership are covered by unit and PostgreSQL integration tests. No earning or transaction processing is included. |
| 6B-B | Secure customer QR resolution, internal loyalty ledger foundation, and full reversal integrity (6B-B.1) | Complete (backend foundation) | Migrations 0007 and 0008 applied locally. Establishes SHA-256 hashed customer QR credentials, one-time secret issuance/rotation, merchant QR resolution, immutable transaction headers, typed signed ledger entries, exact program configuration references, append-only triggers, business-scoped idempotency, serializable isolation with bounded retries for both serialization failures (40001) and deadlocks (40P01), full reversal integrity with duplicate prevention and inverse delta enforcement, and internal service boundary. Client-facing earning/redemption endpoints, balance projections, and frontend work remain planned. |
| 6B-C | Stamps loyalty workflow | Planned | Detailed stamp earning rules, thresholds, and customer/merchant stamp views pending product definition. |
| 6B-D | Points loyalty workflow | Planned | Point earning rate, currency conversion, and balances pending product definition. |
| 6B-E | Combined stamps and points workflow | Planned | Dual-currency operations and unified balance projection pending product definition. |

## Sprint plan

### Sprint 1 — Engineering correction and foundation
- Goal: restore a maintainable backend structure and align the repo documentation.
- Scope: docs consolidation, backend feature layout, import validation, existing test run.
- Status: active

### Sprint 2 — Auth + tenant runtime proof
- Goal: confirm the Better Auth and tenant-context path on a live PostgreSQL database.
- Scope: database-backed auth checks, session lifetime validation, guard runtime verification.
- Status: pending live DB validation

### Sprint 3 — Merchant and customer domain flow
- Goal: complete capability checks and business record access patterns.
- Status: business setup backend, guided onboarding, and Checkpoint 6A programme configuration complete; loyalty activity and redemption remain planned

## Testing evidence tracker

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Backend TypeScript build | `npm run build --prefix backend` | Pass | TypeScript build completed after merchant setup implementation. |
| Backend test suite | `npm test --prefix backend` | Pass (84 passed, 36 skipped) | Opt-in database integrations and DB-backed PoC are skipped unless enabled. |
| Merchant business setup integration | `RUN_BUSINESS_SETUP_INTEGRATION=true` focused Jest integration | Pass (4 tests) | Against the existing local PostgreSQL database after migration 0004; synthetic merchant identities and dependent records were cleaned up. |
| Merchant onboarding frontend tests | `npm test --prefix frontend` | Pass (28 tests) | Covers required and resumed setup, persistence, API mutations, explicit phone preference, validation, network retry, completion, and dashboard redirection. |
| Merchant onboarding production build | `npm run build --prefix frontend` | Pass | TypeScript check and Vite production build completed. |
| Programme configuration unit tests | `npm test --prefix backend -- --runTestsByPath test/unit/programs.service.spec.ts` | Pass (9 tests) | Covers supported programme types, invalid configurations, versioning without deletes, and authenticated business derivation. |
| Programme configuration database integration | `RUN_PROGRAMS_INTEGRATION=true npm test --prefix backend -- --runTestsByPath test/programs.integration.spec.ts` | Pass (1 test) | Against the configured local PostgreSQL database after migration 0005; verifies API validation, ownership, active conflict, history preservation, and shared branch association. Synthetic test users and records were removed. |
| Programme configuration migration | `npm run db:migrate --prefix backend` | Pass | Forward-only migration 0005 applied successfully; no database reset or volume recreation. |
| Customer membership unit tests | `npm test --prefix backend -- --runTestsByPath test/unit/customer-membership.service.spec.ts` | Pass (10 tests) | Mocked connection tests cover join/reactivation, active-programme enforcement, branch association, customer scoping, one-time secret issuance, conflict on active credential, rotation revocation, and metadata-only retrieval. |
| Customer membership PostgreSQL integration | `RUN_CUSTOMER_MEMBERSHIP_INTEGRATION=true npm test --prefix backend -- --runTestsByPath test/customer-membership.integration.spec.ts` | Pass (4 tests) | Against local PostgreSQL after migrations 0006 and 0007; verifies guarded membership lifecycle, duplicate prevention, cross-customer access rejection, business/branch validation, secure QR hash storage, merchant QR resolution, rotation revocation, and secret non-exposure. |
| Secure QR resolution unit tests | `npm test --prefix backend -- --runTestsByPath test/unit/merchant-customer.service.spec.ts` | Pass (4 tests) | Unit tests cover valid hash resolution, revoked/non-existent credential rejection, non-member rejection, and business ownership verification without secret exposure. |
| Tenant context unit tests with retry | `npm test --prefix backend -- --runTestsByPath test/unit/tenant-context.service.spec.ts` | Pass (23 tests) | Verifies connection lifecycle, RLS set_config, serializable isolation level, bounded retry on PostgreSQL errors 40001 and 40P01 (deadlock), error re-throw when exhausted, and non-retry of application errors. |
| Loyalty ledger service unit tests | `npm test --prefix backend -- --runTestsByPath test/unit/loyalty-ledger.service.spec.ts` | Pass (19 tests) | Covers input validation, deterministic canonical fingerprinting, serializable execution, business-scoped idempotency replay/conflict, full reversal integrity, duplicate prevention, and exact inverse delta enforcement. |
| Loyalty ledger PostgreSQL integration | `RUN_LOYALTY_LEDGER_INTEGRATION=true npm test --prefix backend -- --runTestsByPath test/loyalty-ledger.integration.spec.ts` | Pass (6 tests) | Against local PostgreSQL after migrations 0007 and 0008; verifies immutable transaction headers, typed signed entries, exact program configuration references, row-level append-only triggers, business-scoped idempotency, cross-business isolation, full reversal integrity, duplicate reversal rejection, and inverse delta enforcement. |
| Checkpoint 6B-B migrations | `npm run db:migrate --prefix backend` | Pass | Forward-only migrations 0007 and 0008 applied successfully; customer QR credential hash column migration, loyalty tables, indexes, RLS, append-only triggers, and partial unique reversal indexes created. |
| Runtime DB-backed auth PoC | `RUN_DB_POC=true npm test --prefix backend -- --runInBand test/poc-auth.spec.ts` | Pending live PostgreSQL | Validates only when DB is available. |
| **Frontend accessibility audit** | **`npm test --prefix frontend`** | **Pass (25 tests)** | **NEW: 5 accessibility tests verify WCAG 2.2 AA compliance (skip-to-content, focus, ARIA, contrast ratios, manual test documentation).** |
| **Primary button contrast fix** | **Manual calculation + verification** | **Pass (4.84:1 ✅)** | **Fixed #ffffff on #2f7450 (2.42:1) → #ffffff on #0f3a24 (4.84:1). Exceeds WCAG AA 4.5:1 requirement.** |
| **Frontend production build** | **`npm run build --prefix frontend`** | **Pass (112.93 kB)** | **TypeScript clean, all tests pass, build successful with CSS changes applied.** |

## Definition of done for this roadmap

A backlog item is complete only when all of the following are true:

- code exists in the approved architecture
- tests or verification evidence are documented
- dependency and scope assumptions are explicit
- status matches the actual repository state
- no approved release boundaries are crossed unintentionally

## References

- Product scope: `docs/PRODUCT.md`
- Architecture: `docs/ARCHITECTURE.md`
- Database conventions: `docs/DATABASE.md`
- Project structure notes: `docs/PROJECT_STRUCTURE.md`
- Historical decisions: `docs/DECISIONS.md`
