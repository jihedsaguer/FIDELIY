---
paths:
  - "backend/**"
---

# Backend rules

- **Structure:** feature code in `backend/src/features/<feature>`, shared infrastructure in `backend/src/shared`, schema and migrations in `backend/src/database` (single `schema.ts`). Schema decomposition and Better Auth runtime refactoring need explicit approval. No new frameworks or patterns without approval.
- **Auth:** one Better Auth instance on `users`. Customers: phone only in Release 1 (`POST /auth/phone/sign-in`, no OTP). Merchants: email and password. Capabilities come from `customer_accounts` / `merchant_accounts` membership enforced by `CustomerGuard` / `MerchantGuard`; there is no `userType`. Validate the session server-side on every protected request. Never write custom password hashing, token or session code.
- **Tenancy:** run protected queries through `TenantContextService.executeWithContext(userId, ...)`, which sets `app.user_id` for RLS. Derive the business from the session user; never accept owner or business IDs from the client, and never filter by a user ID alone. New tenant tables need RLS policies and tests.
- **RLS caveat:** the local role is a superuser with `BYPASSRLS`, so local tests do not prove isolation. Say so when reporting tenancy tests.
- **Ledger and money:** the loyalty ledger is append-only (triggers); corrections are inverse entries. Approved rules for 6B-C/D/E (integer millimes, floor points, final reversals) are in `DECISIONS` #15; the existing draft earning and redemption code does not match them, so plan before extending it.
- **Migrations:** forward-only SQL under `backend/src/database/migrations`, applied with `npm run db:migrate --prefix backend`. Never reset the database or volumes. A schema change needs an approved plan.
- **Tests:** mandatory for auth, ledger, money and tenant or account separation. Unit specs mock only the database boundary. Integration specs are opt-in (`RUN_*_INTEGRATION=true`) and need a migrated Postgres. Run the narrowest spec: `npm test --prefix backend -- --runTestsByPath <file>`.
- **Secrets:** read configuration through environment variables documented in `.env.example`; never commit values.
