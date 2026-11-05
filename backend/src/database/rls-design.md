# RLS (Row-Level Security) Design - Milestone 1

## Tenant Identity Derivation

### Global User Identity
- Every authenticated request establishes a transaction-scoped context variable: `app.user_id`
- This is set via PostgreSQL's `set_config('app.user_id', userId, true)` within the same transaction
- Context is **transaction-local**: automatically cleared on COMMIT/ROLLBACK
- Never trust client-supplied user IDs; derive all access from authenticated `app.user_id`

### Capability Access Pattern

**Case 1: Customer accessing their data**
```
User ID (authenticated) → customer_accounts.user_id → customer data
```
- Customer can only SELECT `customer_accounts` where `user_id = current_setting('app.user_id')`

**Case 2: Merchant accessing their businesses**
```
User ID (authenticated) → merchant_accounts.user_id → businesses.merchant_id → merchant data
```
- Merchant can only SELECT `businesses` where `merchant_id` is their own merchant_accounts.id
- To verify: `businesses.merchant_id = (SELECT id FROM merchant_accounts WHERE user_id = current_setting('app.user_id'))`

**Case 3: Merchant accessing branches of their businesses**
```
User ID (authenticated) → merchant_accounts.user_id → businesses.merchant_id → branches.business_id → branch data
```
- Merchant can SELECT `branches` where `business_id` is in their list of businesses
- To verify: `branches.business_id IN (SELECT id FROM businesses WHERE merchant_id = (SELECT id FROM merchant_accounts WHERE user_id = current_setting('app.user_id')))`

## Dual-Capability Users

A single user can have **both** `customer_accounts` and `merchant_accounts` records.

Example:
- User ID: `uuid-123`
- Has `customer_accounts` record (enrolled in loyalty programs)
- Has `merchant_accounts` record (runs a business)

RLS policies are **role-specific**, not user-specific:
- When accessing `customer_accounts`, RLS filters to their customer record
- When accessing `businesses`, RLS filters to their merchant record
- Application code/guards determine which role the current request is operating under

## Security Context & Connection Pooling

### Transaction-Local RLS Context
1. Connection pool provides a connection
2. Transaction begins
3. `set_config('app.user_id', userId, true)` sets context for **this transaction only**
4. Queries execute with correct tenant filtering
5. Transaction COMMITs or ROLLBACKs
6. Context automatically cleared (not persisted)
7. Connection returns to pool, ready for next request/transaction

### Critical: No Context Leakage
- RLS context is set **within** the transaction, not on the connection
- `true` parameter = transaction-scoped (not connection-scoped)
- Next request gets a fresh connection or a connection with default RLS context
- No cross-request contamination

### Table Owner & Bypass Risk
- All tables owned by `postgres` or non-superuser role (migration role)
- Superuser (`postgres`) bypasses RLS (expected; used for migrations only)
- Application role (NestJS service) has no superuser privileges
- RLS cannot be disabled by application layer

## Policies Implemented in Milestone 1

### customer_accounts
- **SELECT:** User can view only their own record
  ```sql
  (user_id = current_setting('app.user_id')::uuid)
  ```
- **INSERT:** User can create only their own record (enforced by application)
- **UPDATE/DELETE:** Prevented (account deletion handled at user level)

### merchant_accounts
- **SELECT:** User can view only their own record
  ```sql
  (user_id = current_setting('app.user_id')::uuid)
  ```
- **INSERT:** User can create only their own record (enforced by application)
- **UPDATE/DELETE:** Prevented (account deletion handled at user level)

### businesses
- **SELECT:** Merchant can view only their own businesses
  ```sql
  (merchant_id = (SELECT id FROM merchant_accounts WHERE user_id = current_setting('app.user_id')::uuid))
  ```
- **INSERT/UPDATE:** Merchant can manage only their own businesses
- **DELETE:** Prevented (archive instead)

### branches
- **SELECT:** Merchant can view only branches of their businesses
  ```sql
  (business_id IN (SELECT id FROM businesses WHERE merchant_id = (SELECT id FROM merchant_accounts WHERE user_id = current_setting('app.user_id')::uuid)))
  ```
- **INSERT/UPDATE:** Merchant can manage only branches of their businesses
- **DELETE:** Prevented (archive instead)

### users, accounts, sessions, verifications
- **No RLS on auth tables** (Better Auth manages session scope)
- Applications must enforce authentication before accessing these tables
- Never query these tables without verifying the authenticated user

## Limitations & Assumptions (Milestone 1)

1. **No cross-tenant joins in SELECT**: Queries must respect RLS boundaries in WHERE clauses
2. **Admin access not yet implemented**: Milestone 1 has no admin bypass role (defer to later milestone)
3. **Audit logging not enforced**: No trigger-based audit trail yet (defer to later milestone)
4. **No field-level encryption**: All data encrypted at rest in production (Postgres native/provider-level)
5. **RLS context set per transaction**: Application must call TenantContextService on every protected operation
6. **No automatic RLS context injection**: Repositories must explicitly receive `tx` (transaction object) to enforce context
