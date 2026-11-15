# Database Schema & Design

## 1. Overview

FIDELIY uses PostgreSQL with row-level security (RLS) to enforce multi-tenant data isolation. Drizzle ORM provides type-safe database abstraction with full TypeScript support. The schema is portable between Supabase (development) and Neon (production alternative).

## 2. Core Entities & Relationships

### Users & Authentication (Better Auth + Global Identity)
```
users (Global user identity, managed by Better Auth)
├─ id: UUID (PK)
├─ email: varchar (nullable, optional for recovery)
├─ phoneNumber: varchar (nullable, customer phone)
└─ createdAt: timestamp
└─ Note: No userType field; capabilities determined by account table membership

userAccount (Better Auth account linking)
├─ id: UUID
├─ userId: UUID (FK → users.id)
├─ provider: 'phone-number' | 'email-password' | 'oauth'
├─ providerId: varchar
└─ accountLinkId: UUID (for multi-provider linking)

userSession (Better Auth managed)
├─ id: UUID
├─ userId: UUID (FK → users.id)
├─ token: varchar
├─ expiresAt: timestamp
└─ createdAt: timestamp
```

### Domain: Customer Capability
```
customer_accounts (Customer-specific capability and data)
├─ id: UUID (PK)
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ phoneVerified: boolean (OTP verification status)
├─ joinedAt: timestamp
└─ Constraint: One customer account per user
└─ RLS Policy: User can only select their own record
```

### Domain: Merchant Capability & Businesses
```
merchant_accounts (Merchant-specific capability and data)
├─ id: UUID (PK)
├─ user_id: UUID (FK → users.id, UNIQUE)
├─ businessName: varchar (optional, for merchant branding)
├─ emailVerified: boolean (email verification status)
├─ registeredAt: timestamp
└─ Constraint: One merchant account per user
└─ RLS Policy: User can only select their own record

Note: One user can have BOTH customer_accounts AND merchant_accounts records.
Example: User 123 is both a customer (earning rewards) and a merchant (managing program).
```

### Authentication lifecycle

Migration `0003_auth_lifecycle` allows multiple Better Auth sessions per user. It also provisions a customer capability when a Better Auth user has a verified phone number and a merchant capability when a Better Auth `credential` account is created. Provisioning uses the user ID from the Better Auth database row, not request-supplied role or ownership data.

### Domain: Businesses
```
businesses (Merchant-owned business/brand; one per merchant account)
├─ id: UUID (PK)
├─ merchant_id: UUID (FK → merchant_accounts.id)
├─ name: varchar
├─ description: text (optional)
├─ branch_count: integer
├─ business_phone: varchar(20), nullable until configured
├─ phone_publicly_displayed: boolean (default false)
├─ phone_visibility_configured: boolean (default false; distinguishes default from explicit choice)
├─ logo_url: varchar(2048), optional until completion
├─ theme_primary_color / theme_accent_color: #RRGGBB, optional until completion
├─ onboarding_completed: boolean (default false; set only after backend validation)
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select/insert/update only their own business

branches (Locations under one business/brand)
├─ id: UUID (PK)
├─ business_id: UUID (FK → businesses.id; non-unique index permits multiple branches)
├─ name: varchar
├─ address: varchar (optional in schema; required for onboarding completion)
├─ phone: varchar (optional)
├─ qr_code_id: varchar (unique opaque identifier; QR generation is not part of setup)
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select only branches of their businesses
```

Migration `0004_merchant_business_setup` adds the business setup fields and changes the branch-to-business index from unique to non-unique. It preserves existing business/branch rows and the existing merchant ownership path.

The business setup API reports `required` when no business exists, `in_progress` while `onboarding_completed` is false, and `complete` only after the backend validates every required field. The default public-phone setting remains false; `phone_visibility_configured` tracks whether the merchant explicitly selected true or false.

### Domain: Loyalty Programs
```
programs (Business-level, versioned programme selection)
├─ id: UUID (PK)
├─ business_id: UUID (FK → businesses.id; branches share this programme)
├─ type: 'stamps' | 'points' | 'both'
├─ version: integer (unique within the business)
├─ status: 'active' | 'inactive'
├─ activated_at / deactivated_at: timestamp (explicit lifecycle)
└─ created_at: timestamp

program_configurations (One immutable settings record per enabled type/version)
├─ id: UUID (PK; future activity can reference this exact configuration)
├─ program_id: UUID (FK → programs.id)
├─ type: 'stamps' | 'points'
├─ settings: JSON object (mechanics intentionally not defined in Checkpoint 6A)
└─ created_at: timestamp
```

Migration `0005_versioned_program_configuration` adds these tables, owner-scoped RLS policies, and a partial unique index permitting at most one active programme per business. Each programme version has one configuration row per enabled type. A change deactivates the previous version and inserts a new one in the same transaction; history is retained, and foreign keys restrict deletion of programme history. Branches inherit the business-level configuration through `branches.business_id`.

The policies are an additional tenant boundary, not a claim of database-enforced isolation in the current local environment: its application role has the known `BYPASSRLS` limitation. Service operations also scope every read/write through the authenticated user’s business ownership.

The merchant API exposes `GET /programs/current`, `GET /programs/history`, `POST /programs` for initial creation, and `POST /programs/versions` for a new active version. A payload selects `stamps`, `points`, or `both` and supplies one JSON object per enabled type under `configurations`. Empty objects are accepted because earning, spending, conversion, and reward fields are not yet product-defined. The API derives the business from the authenticated merchant and does not accept business or merchant identifiers as ownership proof. Future configuration-specific loyalty activity must reference the relevant `program_configurations.id`; no transaction, balance, membership, earning, or redemption tables are implemented by this checkpoint.

The currently documented earning rules, reward thresholds, enrollments, balances, transactions, rewards, and redemption records below are future product/domain designs, not implemented tables. No subscription or entitlement model currently exists.

### Domain: Memberships & Customer QR Credentials (Checkpoint 6B-A & 6B-B)
```
customer_business_memberships (Business-scoped customer enrollment)
├─ id: UUID (PK)
├─ customer_account_id: UUID (FK → customer_accounts.id)
├─ business_id: UUID (FK → businesses.id)
├─ status: 'active' | 'inactive'
├─ joined_at: timestamp
├─ left_at: timestamp (nullable)
├─ created_at / updated_at: timestamp
├─ UNIQUE(customer_account_id, business_id)
└─ UNIQUE(id, business_id) -- for compound FKs

membership_lifecycle_events (Append-only membership join/leave audit trail)
├─ id: UUID (PK)
├─ membership_id: UUID (FK → customer_business_memberships.id)
├─ type: 'joined' | 'left'
└─ occurred_at: timestamp

customer_qr_credentials (Personal customer QR credential lifecycle)
├─ id: UUID (PK)
├─ customer_account_id: UUID (FK → customer_accounts.id)
├─ credential_hash: varchar(64) (UNIQUE, SHA-256 hex digest)
├─ issued_at: timestamp
├─ revoked_at: timestamp (nullable)
└─ UNIQUE(customer_account_id) WHERE revoked_at IS NULL
```

Migration `0006_customer_business_memberships` introduced business-scoped memberships, public business QR identifiers, and personal QR credential storage. Migration `0007_secure_customer_qr_loyalty_ledger` migrated plaintext credentials to 64-character SHA-256 hashes (`credential_hash`), ensuring raw secrets are returned only once upon issuance or rotation and never stored or returned in ordinary read APIs. Credential resolution compares the presented credential's SHA-256 hash against active records in the database.

### Domain: Internal Loyalty Ledger (Checkpoint 6B-B)
```
loyalty_transactions (Immutable activity transaction headers)
├─ id: UUID (PK)
├─ business_id: UUID (FK → businesses.id)
├─ membership_id: UUID (FK → customer_business_memberships.id via (membership_id, business_id))
├─ branch_id: UUID (FK → branches.id via (branch_id, business_id), nullable)
├─ merchant_account_id: UUID (FK → merchant_accounts.id)
├─ category: 'purchase' | 'manual_adjustment' | 'reversal'
├─ occurred_at: timestamp
├─ idempotency_key: varchar(128)
├─ request_fingerprint: varchar(64) (SHA-256 hex of canonical payload)
├─ reverses_transaction_id: UUID (FK → loyalty_transactions.id via (reverses_transaction_id, business_id, membership_id), nullable)
├─ created_at: timestamp
├─ UNIQUE(business_id, idempotency_key)
├─ UNIQUE(id, business_id, membership_id) -- compound key for safe reversal references
├─ UNIQUE(reverses_transaction_id) WHERE reverses_transaction_id IS NOT NULL -- single reversal per transaction
└─ CONSTRAINT: length(idempotency_key) BETWEEN 1 AND 128
└─ CONSTRAINT: request_fingerprint ~ '^[0-9a-f]{64}$'
└─ CONSTRAINT: category = 'reversal' <=> reverses_transaction_id IS NOT NULL

loyalty_activity_entries (Typed signed ledger delta records)
├─ id: UUID (PK)
├─ transaction_id: UUID (FK → loyalty_transactions.id)
├─ activity_type: 'stamps' | 'points'
├─ delta: integer (CONSTRAINT: delta <> 0)
├─ program_configuration_id: UUID (FK → program_configurations.id)
├─ reverses_entry_id: UUID (FK → loyalty_activity_entries.id, nullable)
├─ created_at: timestamp
├─ INDEX(transaction_id)
├─ INDEX(program_configuration_id)
└─ UNIQUE(reverses_entry_id) WHERE reverses_entry_id IS NOT NULL -- single reversal per entry
```

Migration `0007_secure_customer_qr_loyalty_ledger` adds `loyalty_transactions` and `loyalty_activity_entries` with database-level append-only triggers (`reject_loyalty_ledger_mutation`) preventing `UPDATE` and `DELETE` operations. Ledger operations execute inside serializable transactions with bounded retries for PostgreSQL serialization conflicts (`40001`) and deadlocks (`40P01`). Idempotency is business-scoped and verified against deterministic SHA-256 payload fingerprints.

Migration `0008_full_reversal_integrity` adds database-level uniqueness for `reverses_transaction_id` and `reverses_entry_id`, guaranteeing at most one reversal transaction per original transaction and at most one reversal entry per original entry. Exact inverse delta matching (`delta = -original.delta`) and complete original entry set coverage are enforced in the serializable transaction service layer.

There are NO client-facing or merchant-facing transaction write endpoints in Checkpoint 6B-B. Stamp/point earning formulas, customer balances, and reward redemptions remain planned for future checkpoints.

### Domain: Rewards & Redemptions (Future Design)
```
rewards (Reward definitions)
├─ id: UUID (PK)
├─ programId: UUID (FK → programs.id)
├─ name: varchar
├─ description: text
├─ stampsRequired: integer (nullable, if stamps program)
├─ pointsRequired: integer (nullable, if points program)
├─ inventory: integer (optional, -1 for unlimited)
├─ isActive: boolean
├─ expiresAt: timestamp (optional)
├─ createdAt: timestamp
└─ RLS Policy: Customer can view active rewards for their programs; merchant can manage their rewards

redemptionCodes (One-time redeemable codes per reward claim)
├─ id: UUID (PK)
├─ rewardId: UUID (FK → rewards.id)
├─ customerId: UUID (FK → customers.id)
├─ code: varchar (UNIQUE)
├─ isRedeemed: boolean
├─ redeemedAt: timestamp (nullable)
├─ redeemedByBranchId: UUID (FK → branches.id, nullable)
├─ expiresAt: timestamp (optional)
├─ createdAt: timestamp
└─ RLS Policy: Customer can view only their codes; merchant can redeem codes for their branches
```

### Admin & Audit
```
auditLog (All sensitive operations)
├─ id: UUID (PK)
├─ userId: UUID (nullable, user who performed action)
├─ action: varchar (e.g., 'TRANSACTION_CONFIRMED', 'REWARD_REDEEMED')
├─ resourceType: varchar (e.g., 'Transaction', 'Reward')
├─ resourceId: UUID
├─ oldValues: JSON (before state)
├─ newValues: JSON (after state)
├─ createdAt: timestamp
└─ No RLS (admin only)
```

## 3. Key Constraints & Indexes

### Primary & Foreign Keys
- All foreign keys ENFORCED
- Cascading deletes only where explicitly documented (rare)

### Unique Constraints
- `customers.userId` — One customer record per user
- `merchants.userId` — One merchant record per user
- `enrollments(customerId, programId)` — Cannot enroll twice in same program
- `branches.qrCodeId` — Each branch has unique QR identifier
- `redemptionCodes.code` — One-time redeemable

### Check Constraints
- `transactions.amount >= 0`
- `balances.stamps >= 0`
- `balances.points >= 0`
- `rewards.inventory >= -1` (unlimited = -1)

### Important Indexes
```sql
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_businesses_merchant_id ON businesses(merchant_id);
CREATE INDEX idx_branches_business_id ON branches(business_id);
CREATE INDEX idx_enrollments_customer_id ON enrollments(customer_id);
CREATE INDEX idx_enrollments_program_id ON enrollments(program_id);
CREATE INDEX idx_transactions_enrollment_id ON transactions(enrollment_id);
CREATE INDEX idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_balances_enrollment_id ON balances(enrollment_id);
CREATE INDEX idx_rewards_program_id ON rewards(program_id);
CREATE INDEX idx_redemption_codes_customer_id ON redemption_codes(customer_id);
CREATE INDEX idx_redemption_codes_reward_id ON redemption_codes(reward_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

## 4. Row-Level Security (RLS) Policies

### RLS Context (Set Per Request)
```sql
-- In NestJS guard or middleware
SET rls.current_user_id = '{userId}'::uuid;
SET rls.current_user_type = '{userType}';  -- 'customer' or 'merchant'
```

### Customer RLS Policies
```sql
-- Customers can view only their own data
CREATE POLICY customer_isolation_customers
ON customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY customer_isolation_enrollments
ON enrollments
FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY customer_isolation_balances
ON balances
FOR SELECT
TO authenticated
USING (enrollment_id IN (
  SELECT id FROM enrollments
  WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
));

CREATE POLICY customer_isolation_transactions
ON transactions
FOR SELECT
TO authenticated
USING (enrollment_id IN (
  SELECT id FROM enrollments
  WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
));
```

### Merchant RLS Policies
```sql
-- Merchants can view/modify only their own businesses
CREATE POLICY merchant_isolation_merchants
ON merchants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY merchant_isolation_businesses
ON businesses
FOR SELECT
TO authenticated
USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY merchant_isolation_branches
ON branches
FOR SELECT
TO authenticated
USING (business_id IN (
  SELECT id FROM businesses
  WHERE merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
));

CREATE POLICY merchant_isolation_programs
ON programs
FOR SELECT
TO authenticated
USING (business_id IN (
  SELECT id FROM businesses
  WHERE merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
));

CREATE POLICY merchant_isolation_transactions
ON transactions
FOR SELECT
TO authenticated
USING (branch_id IN (
  SELECT id FROM branches
  WHERE business_id IN (
    SELECT id FROM businesses
    WHERE merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  )
));
```

### Local Docker Development

The root `docker-compose.yml` runs the existing PostgreSQL service and the backend as separate containers. The backend connects to the database through the Compose service hostname `postgres` on port `5432`; do not use `localhost` for the container-to-container connection. The root `.env` must provide `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET`. In PowerShell, build and start both services with:

```powershell
$env:COMPOSE_BAKE = "false"
docker compose up -d --build backend
```

Disabling Compose Bake avoids its `.env` parser rejecting a UTF-8 BOM in the current root `.env`.

The current local development database role is a PostgreSQL superuser and bypasses RLS. RLS policies are therefore not effectively enforced for backend connections in this environment. Do not introduce real tenant data or deploy with this role; establish and verify a least-privilege application role before either.

## 5. Transaction Isolation for Loyalty Operations

### Earning Transaction (Atomic)
```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- Verify customer membership
  SELECT * FROM enrollments WHERE id = {enrollmentId} FOR UPDATE;
  
  -- Calculate eligible rewards
  -- (based on program rules and amount)
  
  -- Add transaction record
  INSERT INTO transactions (...) VALUES (...);
  
  -- Update balance
  UPDATE balances SET stamps = stamps + {stampAwarded}, points = points + {pointsAwarded}
  WHERE enrollment_id = {enrollmentId};
COMMIT;
```

### Redemption Transaction (Atomic with Idempotency)
```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- Verify reward eligibility
  SELECT * FROM rewards WHERE id = {rewardId} FOR UPDATE;
  
  -- Check current balance
  SELECT * FROM balances WHERE enrollment_id = {enrollmentId} FOR UPDATE;
  
  -- Verify balance sufficient for reward
  IF (current_balance < required) THEN RAISE ERROR; END IF;
  
  -- Deduct from balance
  UPDATE balances SET stamps = stamps - {stampsUsed}, points = points - {pointsUsed}
  WHERE enrollment_id = {enrollmentId};
  
  -- Mark redemption code as redeemed
  UPDATE redemption_codes SET is_redeemed = true, redeemed_at = NOW()
  WHERE id = {codeId};
COMMIT;
```

## 6. Drizzle ORM Schema Patterns

### Example Table Definition
```typescript
// src/database/schema.ts
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, decimal, jsonb } from 'drizzle-orm/pg-core'

export const customers = pgTable('customers', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull().unique(),
  phoneVerified: boolean().notNull().default(false),
  joinedAt: timestamp().notNull().defaultNow(),
})

export const programs = pgTable('programs', {
  id: uuid().primaryKey().defaultRandom(),
  businessId: uuid().notNull(),
  name: varchar().notNull(),
  type: varchar().notNull(), // 'stamps' | 'points' | 'combined'
  earningRule: jsonb().notNull(),
  rewardThreshold: integer().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
})
```

### Query Example
```typescript
// Select customer's current balances
const balances = await db
  .select()
  .from(balances)
  .leftJoin(enrollments, eq(balances.enrollmentId, enrollments.id))
  .leftJoin(programs, eq(enrollments.programId, programs.id))
  .where(eq(enrollments.customerId, customerId))
```

## 7. Migrations Strategy

### Development

```bash
# Generate migration
npx drizzle-kit generate

# Apply reviewed migrations through the existing runner
npm run db:migrate
```

### Production (Neon or Supabase)
```bash
# Generate migration
npx drizzle-kit generate

# Create migration file
npx drizzle-kit migrate

# Run migration (explicit control)
npm run migrate:prod
```

## 8. Backup & Disaster Recovery

### Development (Supabase)
- Daily backups via Supabase (automatic)
- Manual exports for version control

### Production (Neon Alternative)
- Daily backups (automated)
- Point-in-time recovery (PITR) enabled
- RTO: < 1 hour
- RPO: < 15 minutes

## 9. Supabase Development vs Neon Production

### Supabase (Development Focus)
- Integrated PostgreSQL + Auth + RLS
- Free tier: Sufficient for development/testing
- Web interface for RLS policy management
- Real-time subscriptions (not used in Release 1)

### Neon (Production Alternative)
- Serverless PostgreSQL
- Auto-scaling compute
- Cost-effective for variable workloads
- Full PostgreSQL compatibility (RLS works identically)

### Portability Strategy
- **Schema:** Drizzle-managed; no Supabase-specific extensions
- **Data:** Native Postgres dump/restore compatible
- **RLS:** PostgreSQL standard; works on both
- **Migrations:** Drizzle handles driver differences

### Migration Path (Phase 2 consideration)
1. Create Neon project with identical schema
2. Test against staging Neon database
3. Perform full database migration via pg_dump/pg_restore
4. Update DATABASE_URL to Neon connection string
5. Verify RLS policies work identically

## 10. Performance Considerations

### Connection Pooling
- Development: PgBouncer locally (optional)
- Production Phase 1: Single connection pool per NestJS instance
- Production Phase 2: Shared PgBouncer layer (if needed)

### Query Optimization
- All indexes created at migration time
- Queries structured for index usage (explained in code comments)
- RLS policies indexed for efficiency

### Monitoring
- Query performance logging (Phase 2 consideration)
- Slow query alerts (Phase 2 consideration)
- Database size monitoring (Phase 2)
