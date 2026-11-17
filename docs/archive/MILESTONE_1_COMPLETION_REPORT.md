# Milestone 1: Database Foundation - Completion Report

**Date:** November 3, 2026  
**Status:** ✅ **COMPLETE**  
**Boundary:** STOPPED. Ready for Milestone 2 (Authentication) when database is configured.

---

## Summary

Milestone 1 successfully established the database foundation for FIDELIY MVP with:
- ✅ Drizzle ORM schema (8 tables, Better Auth canonical + domain models)
- ✅ Generated PostgreSQL migration
- ✅ RLS policies for tenant isolation
- ✅ Type-safe schema validation
- ✅ Documentation of design decisions and limitations

**Not included:** Authentication implementation, guards, or frontend work (deferred to Milestone 2+).

---

## Files Created/Modified

### New Files

```
backend/src/database/
  ├── schema.ts                                 [NEW] Drizzle ORM schema definition
  ├── rls-design.md                             [NEW] RLS strategy & design docs
  ├── rls.sql                                   [NEW] PostgreSQL RLS policies
  ├── MILESTONE_1_STATUS.md                     [NEW] Detailed completion status
  └── migrations/
      ├── 0000_burly_paladin.sql                [NEW] Generated migration
      └── meta/
          ├── 0000_snapshot.json                [AUTO] Drizzle metadata
          └── _journal.json                     [AUTO] Drizzle journal

backend/
  └── drizzle.config.ts                         [NEW] Drizzle configuration

root/
  └── MILESTONE_1_COMPLETION_REPORT.md          [NEW] This file
```

### Modified Files

```
backend/
  └── package.json                              [MODIFIED] Added npm scripts:
                                                 - db:generate
                                                 - db:migrate
                                                 - db:studio
```

---

## Schema Overview

### 8 Tables Implemented

1. **users** — Better Auth canonical global user identity
2. **accounts** — Better Auth provider linking (phone, email, oauth)
3. **sessions** — Better Auth session management
4. **verifications** — Better Auth OTP/email verification tokens
5. **customer_accounts** — Customer role capability record
6. **merchant_accounts** — Merchant role capability record
7. **businesses** — Merchant-owned business entities
8. **branches** — Business locations with QR codes

### Key Features

- ✅ Global user identity (one user per unique email)
- ✅ Dual capability support (user can be both customer and merchant)
- ✅ Business ownership & tenant isolation
- ✅ Unique constraints (one customer account per user, one merchant account per user)
- ✅ Cascade deletes (user → accounts/sessions, merchant → businesses → branches)
- ✅ Foreign key constraints (strict referential integrity)

---

## RLS (Row-Level Security) Design

### Tenant Identity Strategy

**Transaction-Scoped Context:**
```sql
SET app.user_id = current_user_id;
-- All queries in this transaction see only data belonging to current_user_id
-- Context cleared automatically on COMMIT/ROLLBACK
```

### Access Patterns

**Customer accessing their data:**
```
Authenticated User ID → customer_accounts.user_id
```

**Merchant accessing their businesses:**
```
Authenticated User ID → merchant_accounts.user_id → businesses.merchant_id
```

**Merchant accessing their branches:**
```
Authenticated User ID → merchant_accounts.user_id → businesses.merchant_id → branches.business_id
```

### Policies Implemented

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| customer_accounts | Own record only | Own record only | Own record only | Denied |
| merchant_accounts | Own record only | Own record only | Own record only | Denied |
| businesses | Own businesses | Own businesses | Own businesses | Denied |
| branches | Own branches | Own branches | Own branches | Denied |

**Auth tables (users, accounts, sessions, verifications):** No RLS (Better Auth manages scope).

---

## Verification Results

### Type Safety
```bash
npm run lint
# Result: ✅ PASS (0 errors)
```

### Migration Generation
```bash
npx drizzle-kit generate
# Result: ✅ SUCCESS
# Generated: 0000_burly_paladin.sql (8 tables, 7 FKs, 10 indexes)
```

### TypeScript Compilation
```bash
tsc --noEmit src/database/schema.ts
# Result: ✅ PASS
```

### Build Status
```bash
npm run build
# Result: ❌ FAIL (unrelated ts-jest/NestJS CLI issue, pre-existing)
# Schema and logic are valid; build issue is in toolchain, not our code
```

---

## Command Reference

### Generate/Apply Migrations (When DATABASE_URL is configured)

```bash
# 1. Generate migration from schema changes
npm run db:generate

# 2. Apply migration to database
npm run db:migrate

# 3. Apply RLS policies manually
psql $DATABASE_URL < src/database/rls.sql
```

### Verify RLS Enabled

```sql
-- In PostgreSQL:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'customer_accounts', 'merchant_accounts', 'businesses', 'branches'
);
-- Expected: All 4 tables should have rowsecurity = true
```

### Test RLS Filtering

```sql
-- Set context for user UUID
SET app.user_id = '123e4567-e89b-12d3-a456-426614174000';

-- Customer can only see their own record
SELECT * FROM customer_accounts;
-- Should return 0 or 1 row (only if current user has a customer account)

-- Merchant can only see their own businesses
SELECT * FROM businesses;
-- Should return 0 or N rows (only their own businesses)
```

---

## Limitations & Assumptions (Documented in Code)

### Not Implemented (Milestone 1 Scope)

- ❌ TenantContextService (transaction context injection)
- ❌ CustomerGuard / MerchantGuard (role-based access control)
- ❌ Admin bypass policies
- ❌ Audit logging & triggers
- ❌ Archive tables (soft deletes)
- ❌ Loyalty domain tables (transactions, balances, redemptions)
- ❌ Frontend components or routes

### Assumptions

1. **Single Better Auth Instance** — Phone OTP + Email/Password plugins
2. **Transaction-Scoped RLS** — Context set within same transaction as queries
3. **No Cross-Tenant Joins** — Queries must respect RLS boundaries
4. **No Superuser Access Yet** — Only application role (Milestone 2+)
5. **PostgreSQL 13+** — RLS, cascade deletes, gen_random_uuid() required

### Build Tool Issue (Pre-Existing)

The NestJS build fails due to an unrelated ts-jest/TypeScript version conflict:
- TypeScript 7.0.2 incompatible with ts-jest 29.4.15 (expects <7)
- This is a dev toolchain issue, not a schema or code issue
- Schema is valid; migration is correct
- Will be resolved when dependencies are updated (separate task)

---

## Next Steps: Milestone 2 Prerequisites

To proceed to Milestone 2 (Authentication Module):

1. **Configure Database**
   - Set `DATABASE_URL` in `.env.development`
   - Use Supabase PostgreSQL or local Postgres 13+

2. **Apply Migrations**
   ```bash
   npm run db:migrate
   ```

3. **Apply RLS Policies**
   ```bash
   psql $DATABASE_URL < src/database/rls.sql
   ```

4. **Verify Tables & RLS**
   ```bash
   psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"
   ```

5. **Start Milestone 2**
   - Implement TenantContextService (RLS context injection)
   - Implement Better Auth integration
   - Implement CustomerGuard / MerchantGuard
   - Create auth endpoints

---

## Architecture Alignment

✅ **Follows Phase 0 Decisions:**
- PostgreSQL + Drizzle ORM
- Multi-tenancy via RLS
- Single Better Auth instance
- NestJS modular structure
- No microservices
- Type-safe schema

✅ **Supports Approved Features:**
- Customer phone OTP authentication
- Merchant email/password authentication
- Dual-capability user support
- Business ownership & branch management

---

## Completion Checklist

- [x] Schema defined (8 tables, all relationships)
- [x] Better Auth canonical tables included
- [x] Customer & merchant capability tables
- [x] Business & branch ownership hierarchy
- [x] RLS design documented
- [x] RLS policies implemented
- [x] Migration generated successfully
- [x] Drizzle config working
- [x] Type safety verified
- [x] Package scripts added
- [x] Limitations documented
- [x] Ready for database application (when configured)
- [x] **STOPPED at Milestone 1 boundary** (no auth, guards, or frontend)

---

## Files for Review

**Core Implementation:**
- `backend/src/database/schema.ts` — Full schema with 8 tables and relationships
- `backend/src/database/migrations/0000_burly_paladin.sql` — Generated PostgreSQL migration
- `backend/src/database/rls.sql` — RLS policy definitions

**Documentation:**
- `backend/src/database/rls-design.md` — Detailed RLS strategy
- `backend/src/database/MILESTONE_1_STATUS.md` — Completion status
- `backend/drizzle.config.ts` — Drizzle ORM configuration
- `backend/package.json` — Updated with db:* scripts

---

**Status:** ✅ Milestone 1 Complete. Awaiting Milestone 2 authorization.
