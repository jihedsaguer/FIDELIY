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

### Domain: Businesses
```
businesses (Physical or logical business entities)
├─ id: UUID (PK)
├─ merchant_id: UUID (FK → merchant_accounts.id)
├─ name: varchar
├─ description: text (optional)
├─ branchCount: integer
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select only their own businesses

branches (Individual physical locations)
├─ id: UUID (PK)
├─ businessId: UUID (FK → businesses.id)
├─ name: varchar
├─ address: varchar
├─ phone: varchar (optional)
├─ qrCodeId: varchar (unique, for QR identification)
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select only branches of their businesses

businesses (Physical or logical business entities)
├─ id: UUID (PK)
├─ merchantId: UUID (FK → merchants.id)
├─ name: varchar
├─ description: text (optional)
├─ branchCount: integer
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select only their own businesses

branches (Individual physical locations)
├─ id: UUID (PK)
├─ businessId: UUID (FK → businesses.id)
├─ name: varchar
├─ address: varchar
├─ phone: varchar (optional)
├─ qrCodeId: varchar (unique, for QR identification)
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select only branches of their businesses
```

### Domain: Loyalty Programs
```
programs (Loyalty program configuration)
├─ id: UUID (PK)
├─ businessId: UUID (FK → businesses.id)
├─ name: varchar
├─ type: 'stamps' | 'points' | 'combined'
├─ earningRule: JSON (e.g., { "type": "per_purchase", "value": 1 })
├─ rewardThreshold: integer (points/stamps needed for reward)
├─ isActive: boolean
├─ createdAt: timestamp
└─ RLS Policy: Merchant can select programs of their businesses; customer can select programs they enrolled in
```

### Domain: Memberships
```
enrollments (Customer membership in programs)
├─ id: UUID (PK)
├─ customerId: UUID (FK → customers.id)
├─ programId: UUID (FK → programs.id)
├─ joinedAt: timestamp
├─ isActive: boolean
└─ UNIQUE(customerId, programId)
└─ RLS Policy: Customer can select only their enrollments
```

### Domain: Loyalty Transactions
```
transactions (Earning transactions)
├─ id: UUID (PK, idempotency key)
├─ enrollmentId: UUID (FK → enrollments.id)
├─ branchId: UUID (FK → branches.id)
├─ amount: decimal (purchase amount in DNT or equivalent)
├─ stampAwarded: integer
├─ pointsAwarded: integer
├─ transactionType: 'purchase' | 'manual_award'
├─ merchantConfirmedAt: timestamp
├─ createdAt: timestamp
└─ RLS Policy: Customer can view their transactions; merchant can view transactions for their branches

balances (Current loyalty balance per enrollment)
├─ enrollmentId: UUID (PK, FK → enrollments.id)
├─ stamps: integer (current balance)
├─ points: integer (current balance)
├─ updatedAt: timestamp
└─ CONSTRAINT: stamps >= 0, points >= 0
└─ RLS Policy: Customer can select their balances; merchant can select for their programs
```

### Domain: Rewards & Redemptions
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

### Development (Supabase)
```bash
# Generate migration
npx drizzle-kit generate

# Push to development database
npx drizzle-kit push
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
