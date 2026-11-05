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

**Evidence:** Documented in `docs/PROJECT_STRUCTURE.md`

---

### 10. UI Component Library: shadcn/ui

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
