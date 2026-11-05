# Architecture & Technology Direction

## System Layers

```
┌─────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite + TypeScript)        │
│  - Customer Dashboard                          │
│  - Merchant Dashboard                          │
│  - Admin Interface                             │
│  - Auth UI (Phone OTP, Email/Password)         │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│  Backend (NestJS Modular Monolith)             │
│  - Auth Module (Better Auth integration)       │
│  - Customers Module                            │
│  - Merchants Module                            │
│  - Programs Module (Stamps, Points)            │
│  - Loyalty Module (Transactions, Redemptions)  │
│  - Admin Module                                │
│  - Shared Module (Guards, Utils, RLS)          │
│  - Database Module (Drizzle ORM, Schema)       │
└──────────────────┬──────────────────────────────┘
                   │ SQL / RLS
┌──────────────────▼──────────────────────────────┐
│  Database (PostgreSQL)                         │
│  - Supabase (development)                      │
│  - Neon (production alternative)               │
│  - Row-Level Security for multi-tenancy        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  External Services                             │
│  - Better Auth (Sessions, Credentials)         │
│  - Resend (Transactional Email)                │
│  - SMS Provider (Phone OTP) — PENDING          │
└─────────────────────────────────────────────────┘
```

## Authentication Architecture

**Single Better Auth Instance** with multiple providers:

- **Customer Authentication:** Better Auth Phone Number plugin
  - Phone number sign-up (OTP via SMS)
  - Phone number sign-in (OTP or password)
  - Phone number verification
  - External SMS provider integration (sendOTP callback)
  - Temporary email generation for account creation

- **Merchant Authentication:** Better Auth email/password provider
  - Email/password sign-up
  - Email/password sign-in
  - Email verification (via Resend)
  - Password reset (via email)

- **Account Type Separation (No Separate Identity System):**
  - Single user record per person with immutable `user.userType` field ("customer" | "merchant")
  - Separate `customers` and `merchants` database tables linked via userId
  - NestJS guards (CustomerGuard, MerchantGuard) enforce role-based access
  - All authorization decisions made server-side, not frontend

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **UI Components:** shadcn/ui (Phase 1E)
- **Styling:** Tailwind CSS (via shadcn/ui)
- **State Management:** React Query (server state), Zustand or Context (client state)
- **HTTP Client:** Axios
- **Form Validation:** Zod + React Hook Form
- **Testing:** Vitest

### Backend
- **Runtime:** Node.js 18+
- **Framework:** NestJS
- **ORM:** Drizzle
- **Database:** PostgreSQL 14+
- **Authentication:** Better Auth v0.x with Phone Number plugin
- **Email:** Resend
- **Validation:** Zod
- **Testing:** Jest
- **Logging:** Pino

### Database
- **Primary:** PostgreSQL (Supabase in development, Neon as production alternative)
- **Migration Tool:** Drizzle Kit
- **Row-Level Security:** PostgreSQL native RLS policies
- **Driver:** pg (node-postgres) for initial development; Neon HTTP driver available for serverless

### Third-Party Services
- **Authentication:** Better Auth (official Phone Number plugin for customers, email/password for merchants)
- **Email:** Resend
- **SMS:** PENDING (vendor selection for Tunisia +216 support)
- **Hosting:** TBD (Render, Railway, or Vercel considered for Phase 1A)

## Architecture Decisions

### Why Single Better Auth Instance?
- Unified session management
- Shared user identity (across customer and merchant roles)
- Simpler architecture than separate auth systems
- Account type managed via immutable field and NestJS guards

### Why NestJS Modular Monolith?
- Strong TypeScript support
- Built-in dependency injection and middleware
- Clear module separation without microservices complexity
- Good for Release 1 scale; easy to extract services later if needed

### Why Drizzle over Prisma?
- **Portability:** Works with both Supabase and Neon without vendor lock-in
- **Type Safety:** Full TypeScript support
- **Control:** Low-level SQL access for complex queries and RLS
- **Schema Migrations:** Explicit migration files, easier to audit and version control

### Why PostgreSQL over NoSQL?
- ACID transactions for loyalty point integrity (prevent double-spending)
- Row-level security for multi-tenant isolation
- Relational model matches domain (merchants, customers, programs, transactions)
- No vendor lock-in; portable between Supabase and Neon

### Better Auth Phone Number Plugin + External SMS
- **Issue:** Customer sign-up requires phone OTP; Better Auth now offers official plugin
- **Solution:** Better Auth Phone Number plugin with custom SMS provider integration
- **Approach:** Pass SMS provider credentials (Twilio, Vonage, or other) via `sendOTP` callback
- **Status:** APPROVED (plugin validated, vendor selection pending for Tunisia)

## Known Risks & Trade-Offs

| Risk | Mitigation | Status |
|------|-----------|--------|
| SMS provider for Tunisia | Confirm vendor support for +216; fallback to email if unavailable | PENDING |
| Account type separation (single instance) | NestJS guards enforce; database schema separates concerns | APPROVED |
| Multi-tenancy complexity | RLS policies enforced at DB level; comprehensive tests for isolation | APPROVED |
| Drizzle learning curve | Team ramp-up during Phase 1A; documentation and examples provided | APPROVED |
| Supabase to Neon migration | Drizzle abstracts DB; test migration in Phase 1A | APPROVED |
| Double-spending in loyalty | Atomic transactions with optimistic locking on point balances | APPROVED |

## Pending Validation

- **SMS Provider:** Confirm Tunisia (+216) support; validate pricing and delivery reliability
- **Hosting Platform:** Finalize backend hosting (Render vs Railway vs other)
- **Performance Tuning:** Database connection pooling strategy for production scale
