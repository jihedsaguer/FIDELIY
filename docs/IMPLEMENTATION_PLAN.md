# Implementation Roadmap – Phase 1 (MVP) & Beyond

## Overview

FIDELIY Release 1 (MVP) will be delivered in 6 phases over approximately 24 weeks. Phase 1 (A–F) focuses on core MVP features; Phase 2+ (post-launch) addresses scalability, analytics, and advanced features.

## Phase 1A: Foundation & Core Infrastructure (Weeks 1–4)

**Objective:** Establish development environment, authentication infrastructure, and database foundation.

**Scope:**
- Supabase PostgreSQL setup and schema initialization
- Better Auth integration with both phone (customer) and email/password (merchant) providers
- Better Auth Phone Number plugin configuration and SMS provider integration placeholder
- Initial NestJS project structure with 8 modules
- Drizzle ORM schema and migrations
- RLS policies for multi-tenancy
- Session validation middleware

**Main Deliverables:**
1. Backend project structure (NestJS with modules, guards, middleware)
2. Database schema (users, customers, merchants, businesses, with RLS policies)
3. Better Auth setup (phone plugin, email/password provider, session handling)
4. SMS provider placeholder implementation (sendOTP callback signature)
5. Development environment (Supabase project, local setup, CI/CD pipeline skeleton)

**Acceptance Criteria:**
- [ ] NestJS backend runs locally on port 3000
- [ ] All database tables created and RLS policies applied
- [ ] Better Auth routes mounted (/api/auth/*)
- [ ] Phone OTP verification flow tested (with mock SMS)
- [ ] Merchant email verification flow tested
- [ ] All database migrations automated via Drizzle Kit
- [ ] At least 70% test coverage for auth module
- [ ] Environment variables documented in `.env.example`

**Non-Blocking Task (Parallel):**
- SMS provider research: Contact Twilio, Vonage, Infobip to confirm Tunisia +216 support and pricing
  - Result: Vendor selected by end of Phase 1A (inform Phase 1B integration)

**Dependencies:**
- Supabase account created
- Resend account for email (not critical Phase 1A, but needed for Phase 1B)

**Risks:**
- Better Auth Phone Number plugin compatibility with NestJS (MITIGATED: plugin is official, NestJS wrapper exists)
- SMS provider availability for Tunisia (MITIGATED: parallel research task)

---

## Phase 1B: Customer & Merchant Onboarding (Weeks 5–7)

**Objective:** Implement complete customer and merchant authentication flows with account type separation and role-based guards.

**Scope:**
- Customer sign-up via phone OTP (Better Auth Phone Number plugin)
- Merchant sign-up via email/password (Better Auth)
- NestJS guards for role enforcement (CustomerGuard, MerchantGuard)
- Customer profile creation (post-sign-up flow)
- Merchant profile creation with business details
- Email verification for merchants (Resend)
- Phone verification for customers (SMS provider selected from Phase 1A)
- Session validation on all protected routes
- Frontend sign-up/sign-in pages (React)

**Main Deliverables:**
1. `/api/auth/customer/signup` (phone OTP endpoint)
2. `/api/auth/merchant/signup` (email/password endpoint)
3. `/api/customers/profile` (GET, PATCH — customer-only)
4. `/api/merchants/profile` (GET, PATCH — merchant-only)
5. `CustomerGuard` and `MerchantGuard` NestJS guards
6. Customer and Merchant signup UI pages (React + shadcn/ui)
7. Comprehensive tests for auth flows, guards, and RLS isolation

**Acceptance Criteria:**
- [ ] Customer phone OTP sign-up completes end-to-end
- [ ] Merchant email/password sign-up completes end-to-end
- [ ] CustomerGuard blocks merchant from customer endpoints
- [ ] MerchantGuard blocks customer from merchant endpoints
- [ ] RLS policies verified: Customer A cannot see Customer B's data
- [ ] RLS policies verified: Merchant A cannot see Merchant B's data
- [ ] Email verification link works for merchants (Resend)
- [ ] Phone OTP verification works for customers (SMS provider)
- [ ] Session persists correctly on page reload
- [ ] Tests include multi-tenant isolation verification
- [ ] Frontend pages fully functional (sign-up, sign-in, verification)

**Dependencies:**
- Phase 1A complete (database, Better Auth setup)
- SMS provider selection finalized (from Phase 1A research)
- Resend account created

**Risks:**
- Account type immutability enforcement (MITIGATED: database constraint + application validation)
- RLS policy correctness (MITIGATED: comprehensive isolation tests)

---

## Phase 1C: Business & Program Management (Weeks 8–10)

**Objective:** Implement merchant ability to create businesses and configure loyalty programs.

**Scope:**
- Merchant creates business entity (name, description)
- Merchant adds multiple branches per business
- Merchant creates loyalty programs (stamps, points, or combined)
- Program configuration: earning rules, reward thresholds
- Program rule changes preserve historical balances
- Merchant views program overview and statistics
- Customer discovers programs via QR code
- Customer joins program
- Frontend: Program management pages, QR code generation

**Main Deliverables:**
1. `POST /merchants/businesses` — Create business (merchant-only)
2. `GET /merchants/businesses` — List merchant's businesses
3. `POST /merchants/businesses/:id/branches` — Add branch with QR code
4. `POST /programs` — Create loyalty program (merchant-only)
5. `GET /programs/:id` — View program details (tenant-aware)
6. `PATCH /programs/:id` — Update program rules (merchant-only)
7. `POST /customers/enrollments` — Customer joins program
8. `GET /customers/programs` — Customer's enrolled programs
9. QR code generation and display (frontend)
10. Merchant dashboard showing program overview

**Acceptance Criteria:**
- [ ] Merchant can create business and branches
- [ ] Each branch receives unique QR code
- [ ] Merchant can create stamps-only program
- [ ] Merchant can create points-only program
- [ ] Merchant can create combined program (stamps + points)
- [ ] Program rule changes do not affect past balances
- [ ] Customer can join program via QR scan or manual code
- [ ] Customer sees program in their enrolled list
- [ ] RLS enforces tenant isolation for programs
- [ ] Merchant cannot see other merchants' businesses or programs
- [ ] Customer cannot join same program twice

**Dependencies:**
- Phase 1B complete (auth, guards)
- Database schema updated with programs, enrollments tables

**Risks:**
- Program rule version tracking (MITIGATED: audit log for changes)
- QR code collision (MITIGATED: UUID-based unique codes)

---

## Phase 1D: Core Loyalty Operations (Weeks 11–14) — CRITICAL

**Objective:** Implement purchase earning and reward redemption with atomic transaction integrity.

**Scope:**
- Customer earns stamps/points via purchase (initiated by merchant)
- Point calculation based on program earning rules
- Atomic transaction processing (all-or-nothing)
- Transaction record creation with idempotency key
- Balance update atomicity (SERIALIZABLE isolation level)
- Reward creation and inventory management
- Customer views available rewards
- Redemption flow: Customer claims reward, merchant confirms, one-time code consumed
- Prevent double-spending and concurrent redemptions
- Comprehensive transaction logging for audit

**Main Deliverables:**
1. `POST /loyalty/earn` — Merchant records purchase and calculates reward (atomic transaction)
2. `GET /customers/enrollments/:id/balance` — Current stamp/point balance
3. `GET /programs/:id/rewards` — Available rewards for customer
4. `POST /loyalty/redeem` — Customer initiates redemption
5. `POST /loyalty/redeem/:code/confirm` — Merchant confirms redemption (atomic)
6. `GET /loyalty/transactions` — Transaction history (tenant-aware)
7. Idempotency handling for failed transaction retries
8. Audit logging for all loyalty operations
9. Comprehensive test suite for transaction concurrency

**Acceptance Criteria:**
- [ ] Purchase earning calculates correct stamps/points
- [ ] Balance update is atomic (SERIALIZABLE isolation)
- [ ] Failed transaction does not partially update balance
- [ ] Idempotency key prevents double-charging on retries
- [ ] Concurrent purchase attempts don't cause race conditions
- [ ] Reward creation succeeds with inventory tracking
- [ ] Customer cannot redeem reward without sufficient balance
- [ ] Redemption code consumed after successful redemption
- [ ] Same code cannot be redeemed twice
- [ ] Concurrent redemption attempts fail gracefully
- [ ] Transaction history accessible only to customer/merchant
- [ ] All operations logged in audit table
- [ ] At least 90% test coverage for loyalty module (including concurrency)

**Dependencies:**
- Phase 1C complete (programs, balances)
- Database schema updated with transactions, balances, redemptionCodes tables
- Atomic transaction patterns established

**Critical Testing:**
- Pessimistic locking under concurrent load
- SERIALIZABLE isolation verification
- Idempotency key correctness
- Cross-tenant isolation under load
- Double-spending prevention

**Risks:**
- Concurrent transaction conflicts (MITIGATED: SERIALIZABLE isolation + pessimistic locking + tests)
- Double-spending (MITIGATED: atomic transactions + idempotency keys)
- Performance under concurrency (MITIGATED: connection pooling planning for Phase 2)

---

## Phase 1E: Dashboards & Notifications (Weeks 15–17)

**Objective:** Implement customer and merchant dashboards with real-time data and email notifications.

**Scope:**
- Customer dashboard: Loyalty balance, available rewards, transaction history, personal QR
- Merchant dashboard: Program overview, customer metrics, top performers, recent transactions
- Admin dashboard: System health, merchant list, transaction volume, basic reporting
- Email notifications: Welcome emails, purchase confirmation, redemption confirmation, reward expiration
- QR scanning UX (mobile-friendly)
- Notification preferences (opt-out)

**Main Deliverables:**
1. Customer Dashboard UI (React + shadcn/ui)
   - Balance display (stamps, points)
   - Enrolled programs list
   - Available rewards
   - Recent transactions
   - Personal QR code
   - Notification preferences

2. Merchant Dashboard UI (React + shadcn/ui)
   - Program overview and statistics
   - Customer list with engagement
   - Top customers, popular rewards
   - Recent transactions
   - Program management buttons

3. Admin Dashboard (simple Phase 1)
   - Merchant list
   - Transaction volume
   - System status

4. Email templates (Resend)
   - Welcome to program
   - Purchase confirmation
   - Reward redemption
   - Reward expiration warning

5. `/api/notifications/preferences` — Customer notification opt-out

**Acceptance Criteria:**
- [ ] Customer dashboard loads in < 1s
- [ ] Balance data refreshes when transaction completes
- [ ] Merchant dashboard shows accurate program metrics
- [ ] All notification emails sent via Resend
- [ ] Email templates branded and readable
- [ ] Customer can opt out of notifications
- [ ] QR code scanner works on mobile browsers
- [ ] Dashboard responsive on mobile/tablet/desktop
- [ ] Admin dashboard functional (read-only initially)

**Dependencies:**
- Phase 1D complete (loyalty operations)
- Resend setup complete

**Risks:**
- Real-time data freshness (MITIGATED: React Query polling)
- Email deliverability (MITIGATED: Resend's track record)

---

## Phase 1F: Admin, Audit & Production Prep (Weeks 18–20)

**Objective:** Finalize admin interface, audit logging, and prepare for production deployment.

**Scope:**
- Basic merchant onboarding/approval workflow
- Audit log querying and visualization
- System health checks (database, services)
- Error monitoring and alerting
- Performance baseline documentation
- Security audit and penetration testing readiness
- Documentation and team onboarding materials
- Staging environment setup
- Pre-production checklist

**Main Deliverables:**
1. Admin interface: Merchant approval workflow
2. Audit log dashboard (admin-only)
3. System health endpoint (`/health`)
4. Error tracking integration setup (Sentry or similar)
5. Performance baseline documentation
6. Staging environment fully configured and tested
7. Production deployment runbook
8. Security checklist and compliance notes
9. Team onboarding documentation

**Acceptance Criteria:**
- [ ] Admin can approve/reject merchant accounts
- [ ] All sensitive operations logged in audit table
- [ ] Audit logs queryable by date, user, action
- [ ] Health endpoint returns all service statuses
- [ ] Error tracking configured and tested
- [ ] Performance metrics documented (response times, database latency)
- [ ] Staging env identical to production
- [ ] Pre-production security audit passed
- [ ] Team documentation complete
- [ ] Deployment runbook tested

**Dependencies:**
- All Phase 1A–1E complete
- Monitoring tools selected (Sentry, DataDog, etc.)

---

## Phase 2A: Post-Launch Monitoring & Stability (Weeks 21–24)

**Objective:** Monitor, stabilize, and optimize live platform after release.

**Scope:**
- Production monitoring and alerting
- Database optimization (indexes, query performance)
- Performance tuning (caching, pooling)
- Bug fixes and hotfixes
- Customer support process
- Post-launch metrics analysis
- Capacity planning

**Main Deliverables:**
1. Production monitoring dashboards
2. Alert thresholds and escalation procedures
3. Database performance tuning report
4. Hotfix process documentation
5. 2-week post-launch status report

**Timeline:** Weeks 21–24 (post-launch feedback loop)

---

## Phase 2 & Beyond (Deferred Features)

**Not in Release 1 scope (addressed in future releases):**

- **Phase 2B (Weeks 25–32):** Advanced Features
  - Multi-manager support
  - Delegated permissions
  - Advanced analytics
  - POS integrations

- **Phase 2C (Weeks 33–40):** Scale & Optimization
  - Connection pooling (PgBouncer)
  - Redis caching layer
  - CDN for static assets
  - Database replication

- **Phase 3+:** Extended Features
  - NFC card scanning
  - Public API
  - Mobile apps (native)
  - International expansion

---

## Summary

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| 1A | Weeks 1–4 | Infrastructure, Auth | Ready |
| 1B | Weeks 5–7 | Customer/Merchant Onboarding | Ready |
| 1C | Weeks 8–10 | Programs & Business Management | Ready |
| 1D | Weeks 11–14 | **Core Loyalty** (CRITICAL) | Ready |
| 1E | Weeks 15–17 | Dashboards, Email | Ready |
| 1F | Weeks 18–20 | Admin, Audit, Production | Ready |
| 2A | Weeks 21–24 | Post-Launch Monitoring | Planned |
| 2B+ | Future | Advanced Features | Deferred |

**Total MVP Development: ~20 weeks** + 4 weeks post-launch = 24 weeks to stable Release 1

**Critical Path:** Phase 1A (infrastructure) → Phase 1B (auth) → Phase 1C (programs) → **Phase 1D (loyalty)** → Phase 1E (dashboards) → Phase 1F (production)

Delays in Phase 1D will impact all downstream phases. Priority: Ensure atomic transaction testing is comprehensive.
