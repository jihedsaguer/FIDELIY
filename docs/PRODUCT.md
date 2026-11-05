# Product Specification – FIDELIY

## 1. Vision and Market

**FIDELIY** is a multi-tenant loyalty and rewards platform designed for small to medium businesses in Tunisia. It enables merchants to design and operate flexible loyalty programs—from stamp cards to points systems—while giving customers a unified interface to track rewards, earn benefits, and redeem across enrolled merchants.

**Market Position:**
- Targets retail and service sectors (restaurants, cafes, shops, salons)
- Addresses the gap between enterprise loyalty platforms (complex, expensive) and no system at all
- Leverages mobile penetration and SMS-first accessibility in Tunisia
- Complies with emerging market payment infrastructure (SMS-based, offline-capable)

**Business Model:** Subscription-based per-merchant; freemium tier considered for small merchants.

## 2. User Account Types

### Customer
- **Authentication:** Phone number via OTP (SMS) — no email required for sign-up
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
- Phone-only sign-up via OTP (Better Auth Phone Number plugin)
- Phone-based sign-in (OTP option available)
- Optional phone number update (requires reverification)
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
- Define reward thresholds (e.g., 10 stamps = "Get 1 Free Coffee")
- Track reward inventory
- Approve redemptions

**Customer Engagement**
- View customer list with engagement metrics
- Record purchases (via QR scan or manual entry)
- Issue stamps/points manually if needed
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

### Customer Sign-Up (Phone-Based)

```
1. Customer navigates to FIDELIY app
2. Enters phone number (+216 XXX XX XX XX)
3. Receives OTP via SMS
4. Enters OTP code
5. Account created; session established
6. Prompted to join a program or search for merchants
```

### Customer Joins a Program

```
1. Customer scans merchant QR code (or manually searches)
2. Views program details (name, earning rules, available rewards)
3. Clicks "Join Program"
4. Membership recorded; can now earn rewards at this merchant
```

### Purchase & Earn Rewards (Merchant-Initiated)

```
1. Customer scans their personal QR code at merchant
   (or merchant manually enters customer phone/code)
2. Merchant enters purchase amount (e.g., 50 DNT)
3. System calculates eligible rewards based on program rules
4. Merchant reviews and confirms transaction
5. Rewards added to customer's account
6. Both parties see updated balance
7. Email confirmation sent
```

### Redemption (Merchant-Initiated)

```
1. Customer requests a reward (in-store)
2. Merchant confirms redemption eligibility
3. System verifies reward availability
4. Redemption processed; balance updated
5. Reward marked as redeemed (one-time use)
6. Email confirmation sent
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
- Each reward code is one-time use
- Redemption verified on backend before completion
- Prevents concurrent redemptions of same code
- Expired rewards cannot be redeemed

### Transaction Atomicity
- Earning and redemption are atomic operations
- Either the full transaction succeeds or fails; no partial updates
- Points/stamps balance updated in same transaction as transaction record
- Prevents double-spending or lost transactions

### Expiration Policies
- Rewards can have optional expiration dates
- Expired rewards not visible to customers
- Historical transactions retained indefinitely (audit trail)
- Expired/redeemed rewards tracked separately from active inventory

### Account Type Immutability
- Customer account cannot become merchant and vice versa
- Account type determined at sign-up; not changeable
- Enforced via immutable `user.userType` field in database
- Business logic enforced in NestJS guards (CustomerGuard, MerchantGuard)

## 6. Release 1 Scope

### IN SCOPE
- Customer authentication (phone OTP)
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
- Phone number verification via OTP (prevents unauthorized registration)
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
- **SMS Provider:** Phone OTP delivery (vendor pending for Tunisia +216)
- **Postgres Database:** Supabase (development) or Neon (production alternative)

### Third-Party Libraries
- Drizzle ORM (database abstraction)
- React 18 (frontend)
- NestJS (backend)
- shadcn/ui (UI components)

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
