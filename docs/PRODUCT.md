# Product Specification – FIDELIY

## 1. Vision and Market

**FIDELIY** is a multi-tenant loyalty and rewards platform designed for small to medium businesses in Tunisia. It enables merchants to design and operate flexible loyalty programs—from stamp cards to points systems—while giving customers a unified interface to track rewards, earn benefits, and redeem across enrolled merchants.

**Market Position:**
- Targets retail and service sectors (restaurants, cafes, shops, salons)
- Addresses the gap between enterprise loyalty platforms (complex, expensive) and no system at all
- Leverages mobile penetration and SMS-first accessibility in Tunisia
- Complies with emerging market payment infrastructure (SMS-based, offline-capable)

**Business Model:** Release 1 has no billing, subscription enforcement, or plan limits; transactions are cash-based. Future SaaS monetization (for example per-merchant subscriptions) remains possible and is deferred; it is neither designed nor implemented (DECISIONS #19).

## 2. User Account Types

### Customer
- **Authentication:** Phone number as a unique identifier (not verified in Release 1; OTP verification deferred to Release 2) — no email required for sign-up
- **Global Identity:** One customer identity per person
- **Multi-Membership:** Same customer can join different merchants' programs
- **Independent Balances:** Each program membership has separate point/stamp balances
- **Visibility:** Only see their own programs, balances, and transaction history

### Merchant
- **Authentication:** Email and password
- **Ownership:** One merchant account per person (Release 1)
- **Multiple Businesses:** One merchant can own multiple business locations (branches)
- **Program Management:** Define loyalty program rules, thresholds, reward configurations
- **Visibility:** See their own programs, customer list, engagement metrics

### Admin
- **Role:** Platform-wide administration
- **Responsibilities:** Merchant onboarding, support, reporting, platform health
- **Permissions:** Access to all merchant and customer data (with audit logging)

## 3. Core Features

### Customer Features

**Authentication & Onboarding**
- Phone-number registration: customer self-registration or merchant-assisted registration; the phone number is a unique identifier and is not verified in Release 1
- Phone-based sign-in with the registered phone number (no OTP in Release 1)
- Phone number update (OTP reverification deferred to Release 2)
- Email optional (for notifications only)

**Membership Management**
- Discover programs (via merchant QR code or manual search)
- Join a program
- View enrolled programs and balances
- View transaction history per program

**Rewards Management**
- View available rewards for each program
- Check eligibility for rewards
- Redeem rewards (in-store with merchant confirmation)

**Dashboard**
- Personal QR code (for merchant to scan)
- Current loyalty balances (stamps, points)
- Available rewards
- Recent transactions
- Notification preferences

### Merchant Features

**Program Configuration**
- **Stamp Cards:** Define earning rules (e.g., 1 purchase = 1 stamp; 10 stamps = reward)
- **Points Programs:** Define earning rate (e.g., 1 DNT = 5 points; 100 points = reward)
- **Combined:** Both stamps and points in one program
- **Program Changes:** Update rules without losing customer balances or transaction history

**Reward Management**
- Stamp earning no longer uses `purchasesPerStamp` (deprecated): one stamp per confirmed purchase
- Define multiple reward thresholds per programme (e.g., 10 stamps = "Get 1 Free Coffee"); each reward costs stamps **or** points, never a mix
- Select the reward at redemption; the server verifies the balance
- No reward codes or reward inventory in Release 1 (see DECISIONS.md #15)

**Customer Engagement**
- View customer list with engagement metrics
- Record purchases (via QR scan or manual entry)
- Issue stamps/points manually (deferred; not in 6B-C)
- View customer transaction history

**Dashboard**
- Program overview (active members, engagement)
- Performance metrics (top customers, popular rewards)
- Transaction log (all purchases and redemptions)

### Admin Features

**Merchant Management**
- Onboarding workflow
- Approve/reject merchant accounts
- Support merchant accounts

**Platform Reporting**
- System health and uptime
- Usage statistics
- Transaction volume

## 4. Core Workflows

### Customer Registration (Phone-Based, No OTP in Release 1)

Self-registration:
```
1. Customer navigates to FIDELIY app
2. Enters phone number (+216 XXX XX XX XX)
3. Account is created with the phone number as a unique identifier (not verified); session established
4. Prompted to join a program or search for merchants
```

Merchant-assisted registration:
```
1. At the counter the merchant enters the customer's name and phone number
2. Account is created (or the existing account for that phone number is found) and joined to the business programme
3. The customer can later sign in with the same phone number
```

OTP verification of phone ownership is deferred to Release 2.

### Customer Joins a Program

```
1. Customer scans merchant QR code (or manually searches)
2. Views program details (name, earning rules, available rewards)
3. Clicks "Join Program"
4. Membership recorded; can now earn rewards at this merchant

Alternative (DECISIONS #21): when a merchant validates the customer's personal QR (or short ID) and the customer is not yet a member
(or has left), the customer is enrolled as an active member automatically and the merchant sees a notice. The loyalty card is the
membership plus its ledger-computed balance (0 / 0 at first); nothing else is created. Requires an active programme.
```

### Purchase & Earn Rewards (Merchant-Initiated)

```
1. Customer shows their personal QR code; merchant scans it (the server resolves the customer and enrols them as an active member if needed, DECISIONS #21)
2. Merchant records the purchase amount in TND (decimal, up to 3 places).
   Optional for stamp-only programmes; required when the programme includes points
3. System calculates the result from the active programme (server-side):
   stamps: exactly 1 stamp per confirmed purchase (the amount does not change the count);
   points: floor(amount x rate), integer arithmetic, rate up to 2 decimals
4. If the same customer was awarded within the previous 10 minutes, the merchant sees a warning and must explicitly confirm to proceed (never an automatic block)
5. Merchant confirms; one atomic ledger transaction is written with the amount and exact programme version
6. Both parties see the updated balance (email confirmation is not part of 6B-C)
```

### Redemption (Merchant-Initiated)

```
1. Customer requests a reward (in-store)
2. Merchant scans the customer's QR and selects the reward
3. Server verifies the balance in the same serializable transaction
4. Reward cost is deducted from the balance; any surplus is preserved
5. A redemption transaction is recorded in the ledger (not a manual adjustment)
6. Both parties see the updated balance
```

### Correction (Reversal)

```
1. Owner opens a transaction in the business history
2. Owner enters a required reason (free text, max 500 characters)
3. System reverses the whole transaction with exact inverse entries (once only, idempotent)
4. Refused if any balance would become negative; reverse the dependent redemption first
5. Reversal appears as its own transaction with the reason; it is final (cannot be reversed)
```

### Merchant Sign-Up

```
1. Merchant navigates to FIDELIY
2. Enters email and password
3. Confirms email via link (Resend)
4. Creates first business/program
5. Generates QR code for customers
6. Can now record purchases and manage program
```

## 5. Business Rules

### Multi-Tenancy & Data Isolation
- Each merchant is a separate tenant
- Customers can join multiple merchants' programs but cannot see other merchants' data
- All data access filtered by authenticated user's tenant context
- PostgreSQL RLS enforces isolation at database level

### Program Inheritance (Rule Changes)
- When a merchant updates program rules (e.g., earning rate), existing customer balances are preserved
- New rules apply to future transactions only
- Historical transactions remain unchanged for audit purposes
- No silent balance deletion or conversion

### Reward Redemption Integrity
- Redemption is balance-based: the merchant selects a reward and the server deducts its cost (no reward codes in Release 1)
- Redemption is verified on the backend, in a serializable transaction, before completion
- Prevents concurrent redemptions that would overspend a balance
- A reward costs stamps or points, never a mix; surplus balance is preserved

### Transaction Atomicity
- Earning and redemption are atomic operations
- Either the full transaction succeeds or fails; no partial updates
- Points/stamps balance updated in same transaction as transaction record
- Prevents double-spending or lost transactions

### Expiration Policies
- No stamp, point or reward expiry is enforced in Release 1 (expiry fields may be stored but are ignored); deferred
- Historical transactions retained indefinitely (audit trail)

### Monetary Amounts
- Currency is TND with three decimal places (millimes); amounts are stored as integer millimes
- API amounts are decimal strings, positive, at most 3 decimal places; no silent rounding
- Points earning rates keep at most 2 decimal places and use integer arithmetic; fractions of a point are discarded

### Corrections and History
- The owner may reverse any transaction of their business in full (no time limit, no partial edits), once, with a required reason (max 500 characters); a reversal is final and cannot itself be reversed in Release 1
- A reversal must never make a balance negative
- Past earnings are never recalculated with current programme rules; the ledger is authoritative

### Account Capabilities
- Capabilities are determined by membership in the `customer_accounts` and `merchant_accounts` tables; one person may hold both (DECISIONS #11)
- There is no `userType` field
- Enforced server-side in NestJS guards (CustomerGuard, MerchantGuard), not by frontend logic

## 6. Release 1 Scope

### IN SCOPE
- Customer registration and sign-in by phone number (self-registration and merchant-assisted; phone not verified)
- Merchant authentication (email + password)
- Stamp card programs
- Points-based programs
- Combined (stamp + points) programs
- QR code generation and scanning
- Customer dashboard
- Merchant dashboard
- Admin interface (basic)
- Email notifications (via Resend)
- Transaction history
- Reward redemption
- Multi-tenancy with RLS

### OUT OF SCOPE (Deferred to Phase 2+)
- Multi-manager support
- Delegated permissions (cashier, manager roles)
- NFC card scanning
- Advanced analytics and reporting
- Public API
- Mobile apps (web-responsive only)
- Marketing campaigns
- Referral programs
- Tiered loyalty (VIP tiers, status levels)
- Offline earning/redemption
- POS integrations
- Payment processing
- Billing, subscriptions and plan limits (deferred; future SaaS monetization is not excluded)
- Phone OTP verification (deferred to Release 2)

## 7. Non-Functional Requirements

### Performance
- Customer dashboard loads in < 1s
- Transaction processing completes in < 500ms
- API endpoint response time < 200ms (p95)

### Reliability
- 99.5% uptime SLA (Release 1 MVP excludes SLA guarantees)
- Automated backups (daily for development, hourly for production)
- Disaster recovery plan (RTO < 1 hour, RPO < 15 minutes)

### Security
- Phone numbers are unique identifiers and are not verified in Release 1; OTP verification (to prevent unauthorized registration) is deferred to Release 2
- Email verification for merchant accounts
- Row-level security for multi-tenant data isolation
- HTTPS for all traffic
- Secrets stored in environment variables (no committed credentials)

### Scalability
- Support 1,000 concurrent users (Phase 1 MVP)
- Database connection pooling for high concurrency
- Stateless backend for horizontal scaling
- CDN for static assets (Phase 2 consideration)

## 8. Dependencies

### External Services
- **Better Auth:** Authentication, session management (Phone Number plugin for customers, email/password for merchants)
- **Resend:** Transactional email delivery
- **SMS Provider:** Phone OTP delivery (deferred to Release 2; vendor pending for Tunisia +216; not required for Release 1)
- **PostgreSQL:** Docker (`postgres:16-alpine`) for local development; Neon is the planned deployment database (DECISIONS #18)

### Third-Party Libraries
- Drizzle ORM (database abstraction)
- React 19 + Vite + Tailwind CSS 4 (frontend)
- NestJS (backend)
- In-repo UI primitives in `frontend/src/components/ui` (shadcn/ui was removed; DECISIONS #17)

## 9. Success Metrics

### Merchant Adoption
- Number of active merchants onboarded
- Program creation rate
- Customer enrollment rate per program

### Customer Engagement
- Active customer accounts
- Program join rate
- Transaction frequency
- Redemption rate

### Platform Health
- System uptime percentage
- API response time (p95)
- Customer support ticket resolution time
