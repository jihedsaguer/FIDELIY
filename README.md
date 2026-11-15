# FIDELIY: Digital Loyalty Platform

A modern loyalty and rewards platform built for Tunisian SMBs, enabling merchants to create stamp cards, issue points, and manage customer rewards through a web dashboard.

## Status

**Current engineering focus:** Backend restructuring and documentation consolidation are active. The canonical roadmap is `docs/ROADMAP.md` and it remains the source of truth for sprint, release, and backlog status.

**Release status:** Release 1 remains in progress. PB-19 and PB-20 are explicitly deferred.

Historical roadmap artifacts remain in `docs/IMPLEMENTATION_PLAN.md`, but the maintained plan is the consolidated `docs/ROADMAP.md` document.

## What It Does

- **For Customers:** Join loyalty programs via phone OTP, scan merchant QR codes to earn stamps/points, view balance and rewards.
- **For Merchants:** Create and manage stamp card programs, view customer engagement, mark purchases and issue rewards.
- **For Admins:** Platform oversight, merchant onboarding, support and reporting.

## Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| **Frontend** | React 18 + Vite + TypeScript | ✅ Approved |
| **Backend** | NestJS + modular monolith | ✅ Approved |
| **Database** | PostgreSQL (Supabase dev, Neon alternative) | ✅ Approved |
| **ORM** | Drizzle + pg driver | ✅ Approved |
| **Authentication** | Better Auth (phone plugin + email/password) | ✅ Approved |
| **Email** | Resend | ✅ Approved |
| **SMS Provider** | TBD (Tunisia +216 support) | ⏳ Pending Validation |
| **UI Components** | shadcn/ui | ✅ Approved (Phase 1E) |

**APPROVED ARCHITECTURE:**
- Better Auth Phone Number plugin for customer phone-based sign-up and login
- Better Auth email/password for merchant authentication
- Single Better Auth instance with immutable `user.userType` field
- Account type separation via NestJS guards (CustomerGuard, MerchantGuard)
- PostgreSQL row-level security (RLS) for multi-tenant data isolation
- Drizzle ORM with portability between Supabase (development) and Neon (production alternative)

See `docs/DECISIONS.md` for detailed rationale and evaluation.

## Quick Links

- **Product Spec & Scope:** `docs/PRODUCT.md`
- **Architecture & Tech Choices:** `docs/ARCHITECTURE.md`
- **Database Schema & Migration Strategy:** `docs/DATABASE.md`
- **Project Structure & Organization:** `docs/PROJECT_STRUCTURE.md`
- **Canonical Roadmap:** `docs/ROADMAP.md`
- **Historical Plan:** `docs/IMPLEMENTATION_PLAN.md`
- **Architectural Decisions:** `docs/DECISIONS.md`
- **Technology Reuse Audit:** `docs/RESOURCE_AUDIT.md`
- **Development Guidelines:** `AGENTS.md`

## Phase 1A Prerequisites

1. **Environment Variables** — Create `.env` with:
   - `BETTER_AUTH_SECRET` (generated)
   - `DATABASE_URL` (Supabase development project)
   - `RESEND_API_KEY` (for email)
   - SMS provider credentials (pending vendor confirmation)

2. **Accounts & Services:**
   - Supabase project (PostgreSQL database)
   - Resend account (transactional email)
   - SMS provider account for Tunisia (pending)

3. **Local Development:**
   - Node.js 18+
   - PostgreSQL client tools (for local testing)

## Architecture Overview

**Single Better Auth Instance** with multiple authentication methods:
- **Customers:** Phone Number plugin (OTP via SMS)
- **Merchants:** Email/password provider
- Account type determined by immutable `user.userType` field ("customer" | "merchant")
- Role-based access enforcement via NestJS guards

**Backend Structure (NestJS Modular Monolith):**
- `backend/src/features/auth` — Better Auth integration, phone OTP, email/password setup
- `backend/src/features/customers` — Customer accounts, profiles, memberships
- `backend/src/features/merchants` — Merchant accounts, business management
- `backend/src/features/programs` — Loyalty program configuration (stamps, points)
- `backend/src/features/loyalty` — Earning, redemption, transaction logic
- `backend/src/features/admin` — Platform administration
- `backend/src/shared` — Utilities, database layer, guards, middleware, shared infrastructure
- `backend/src/database` — Drizzle ORM schema, migrations, and generated configuration retained for the current codebase

**Frontend Structure (React + Vite):**
- `features/` — Feature-based organization (auth, customer-dashboard, merchant-dashboard)
- `shared/` — Shared UI components, hooks, utilities
- `pages/` — Route pages (landing, sign-in, dashboards)

**Database:**
- PostgreSQL with Drizzle ORM
- Development: Supabase
- Production alternative: Neon (via Drizzle portability)
- Multi-tenancy: Row-level security (RLS) at database level

## Release 1 Scope

### In Scope
- Customer authentication (phone OTP)
- Merchant authentication (email + password)
- Stamp cards and points programs
- QR code scanning (with manual entry fallback)
- Customer dashboard (balance, history, rewards)
- Merchant dashboard (program management, customer view)
- Admin interface (basic management)
- Email notifications

### Out of Scope (Deferred to Phase 2+)
- Multi-manager support
- Delegated access and permissions
- NFC scanning
- Advanced analytics
- Public API
- Mobile apps

See `docs/PRODUCT.md` for full feature details.

## Development Guidelines

All developers and agents implementing features must follow the mandatory rules in `AGENTS.md`.

Key principles:
- **Reuse-first:** Check existing code before writing new.
- **Respect boundaries:** Release 1 scope and approved architecture only.
- **Inspect before modifying:** Read affected code and trace dependents.
- **Better Auth:** Use Phone Number plugin for customers, email/password for merchants.
- **Guards:** Enforce account type via NestJS guards, not frontend logic.
- **RLS:** All queries respect multi-tenant isolation via Postgres RLS.
- **Report evidence:** Document decisions and changes clearly.

## Phase 1A Readiness

✅ All architectural decisions approved and documented
✅ Better Auth Phone Number plugin validated (official, production-ready)
✅ NestJS + Drizzle + Postgres stack confirmed compatible
✅ Account separation architecture finalized (single instance, guards, immutable userType)
✅ SMS provider research pending (vendor confirmation for Tunisia +216)
⏳ Ready for Phase 1A environment setup upon explicit user approval
