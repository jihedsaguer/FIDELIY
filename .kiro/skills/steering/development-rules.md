# Development Standards

These rules apply to all agents and developers working on FIDELIY.

## Authentication & Authorization

### Better Auth Integration
- **Framework:** Better Auth v0.x (official)
- **Customer Auth:** Phone Number plugin (OTP via SMS) — sign-up, sign-in, verification
- **Merchant Auth:** Email/password provider — sign-up, sign-in, password reset
- **Single Instance:** One Better Auth instance manages both customer and merchant accounts
- **Account Separation:** Immutable `user.userType` field + NestJS guards (CustomerGuard, MerchantGuard)
- **Custom SMS Integration:** Implement via `sendOTP` callback (vendor pending for Tunisia)

### NestJS Guards & Authorization
- Use CustomerGuard for customer-only endpoints
- Use MerchantGuard for merchant-only endpoints
- Always validate session server-side via Better Auth `getSession()`
- Never rely on frontend-only authorization checks
- Verify `user.userType` and tenant context on every protected request

### No Separate Identity System
- Do NOT create separate login flows or identity stores
- Do NOT synchronize sessions between systems
- Manage account types entirely within Better Auth + NestJS guards + database schema

## Code Organization

### Module Organization (NestJS)
- Each feature (auth, customers, programs, etc.) is a self-contained module under `src/modules/`
- Modules contain:
  - `controllers/` — HTTP request handling
  - `services/` — Business logic
  - `dto/` — Data transfer objects
  - `entities/` — Drizzle ORM schema
  - `guards/` — Role-based access control
  - `pipes/` — Validation
  - `repository/` — Data access layer
- Shared utilities live in `src/shared/` (error handling, types, database utilities)
- Cross-module dependencies go through service exports, not direct file imports

### Feature Organization (React)
- Features organized in `src/features/` by domain (auth, customer-dashboard, merchant-dashboard)
- Each feature contains:
  - `components/` — Feature-specific React components
  - `hooks/` — Custom hooks
  - `pages/` — Page components
  - `types/` — TypeScript types
  - `api/` — API client methods
- Shared utilities (UI components, hooks, constants) live in `src/shared/`
- No cross-feature imports; use shared utilities or context to share state

### Multi-Tenancy & Data Isolation
- All database queries must respect tenant boundaries via PostgreSQL RLS
- All NestJS endpoints must validate user's tenant context before executing queries
- Database layer enforces RLS; application layer adds guards as defense-in-depth

## Database & ORM

### Drizzle ORM Schema
- Define all tables in `src/database/schema.ts` using Drizzle TypeScript syntax
- Use strict TypeScript types for all columns
- Define relationships explicitly with foreign keys
- Document complex queries with comments

### Multi-Tenancy via RLS
- Every query-exposed table includes `tenant_id` or merchant/customer foreign key
- PostgreSQL RLS policies enforce isolation at database level
- Set current session variable for tenant context: `SET rls.current_user_type = 'customer'` and `SET rls.current_user_id = {userId}`
- Application-level filtering is secondary; RLS is the baseline

### Transaction Integrity
- Use atomic transactions for loyalty operations (earning, redemption)
- Prevent double-spending via UNIQUE constraints on transaction IDs
- Use pessimistic locking (SELECT FOR UPDATE) for point balance updates if needed
- Test all critical paths for atomicity

### Migrations
- Use Drizzle Kit to generate migrations: `drizzle-kit generate`
- Run migrations explicitly: `drizzle-kit push` (development) or `drizzle-kit migrate` (production)
- Never skip migrations or alter schemas without documentation

## Testing Requirements

### Mandatory Testing
- All new features must include unit tests
- All bug fixes must include a test that reproduces the bug
- Critical paths (auth, point transactions, multi-tenancy) require integration tests
- Multi-tenant isolation tests: verify RLS policies prevent cross-tenant access
- Account type tests: verify CustomerGuard and MerchantGuard correctly enforce roles

### Running Tests
- Backend: `npm run test` (from backend directory)
- Frontend: `npm run test` (from frontend directory)
- Fix test failures before pushing
- Do not commit with `--no-verify` to skip pre-commit hooks

### Coverage Targets
- Aim for 70%+ coverage on critical modules (auth, loyalty, multi-tenancy)
- Coverage is informational; comprehensive behavior-driven tests matter more

## Secrets & Configuration

### Environment Variables
- Never commit `.env`, API keys, credentials, or secrets
- Use environment variables for all external credentials:
  - `BETTER_AUTH_SECRET` — Better Auth session secret (32+ chars)
  - `BETTER_AUTH_URL` — Base URL for auth callbacks
  - `DATABASE_URL` — PostgreSQL connection string
  - `RESEND_API_KEY` — Email delivery
  - SMS provider credentials (pending vendor selection)
- Document required variables in `.env.example`

### Supabase vs Neon Strategy
- **Development:** Supabase PostgreSQL project
- **Testing:** Local or separate Supabase project
- **Production Alternative:** Neon (via Drizzle portability; no Supabase-specific code)
- **Avoid:** Supabase-specific features (auth, realtime) unless necessary; keep code portable

## Code Style & Conventions

### TypeScript
- Use strict TypeScript mode (`strict: true` in tsconfig.json)
- Prefer explicit types over `any`
- Use interfaces for public contracts; types for internal structures

### Naming
- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and types
- Use `UPPER_SNAKE_CASE` for constants
- Prefix boolean functions with `is` or `has` (e.g., `isCustomer`, `hasPermission`)
- Prefix guards with "Guard" suffix (e.g., `CustomerGuard`, `MerchantGuard`)

### Comments & Documentation
- Comment why, not what. Code shows what; comments explain intent
- Document public functions with JSDoc comments
- Link to `docs/` files or decisions when relevant
- Include example usage for complex utilities

### Commits & PRs
- Use clear, evidence-based commit messages: `feat: add phone OTP sign-up via Better Auth plugin`
- Include file paths in PRs: `Modified src/modules/auth/phone-otp.service.ts`
- Reference `docs/DECISIONS.md` if applicable
- Do not commit unrelated refactoring or cleanup in the same PR as feature work

## Token Efficiency (For AI Agents)

When implementing tasks, optimize for token usage:

### Search & Read Strategy
- **Search first:** Use grep or file search to locate candidates
- **Batch reads:** Read related files in parallel, not sequentially
- **Targeted reads:** Extract function signatures for large files; read full files only when essential
- **Reference docs:** Link to approved documentation instead of repeating content

### Implementation
- Start with skeleton code; refine iteratively
- Reference existing patterns; avoid explaining every line
- Include only essential comments; rely on clear naming

## Avoiding Enterprise Complexity

### In Release 1
- ✅ Do: Simple, direct implementations
- ✅ Do: Focused features with clear requirements
- ✅ Do: Explicit error messages
- ❌ Don't: Over-engineer for future scalability
- ❌ Don't: Add configurability beyond Release 1 scope
- ❌ Don't: Implement advanced error recovery without clear need

### Rule
If a feature is not in Release 1 scope and not required by the current task, defer it. Document TODOs for Phase 2.
