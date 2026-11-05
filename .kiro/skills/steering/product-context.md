# Product Context

## Vision

FIDELIY is a digital loyalty platform for Tunisian SMBs, enabling merchants to create and manage customer reward programs (stamps, points) without requiring custom development.

## Release 1 User Types

### Customers
- Sign up via phone OTP (SMS verification)
- Create account without email requirement
- Can also be a merchant (one person supporting both roles)
- View loyalty balance across programs
- Scan merchant QR codes to earn rewards
- View transaction history and available rewards
- Redeem rewards in-store

### Merchants
- Sign up via email and password
- Can also collect loyalty rewards as a customer
- Create stamp card or points programs
- Manage program rules (earning, reward thresholds)
- View customer list and engagement metrics
- Record customer purchases and issue rewards
- Manage basic team access (owner only in Release 1)

### Admins
- Platform oversight
- Merchant onboarding approval
- Support and reporting

## Release 1 Core Workflows

### Customer Enrollment
1. Customer enters phone number
2. Receives OTP via SMS
3. Verifies OTP, creates account (via Better Auth Phone Number plugin)
4. Views available programs
5. Joins program(s)

### Loyalty Transaction
1. Customer scans merchant QR code or provides manual code
2. Merchant records purchase amount
3. System calculates and issues reward (stamps/points)
4. Customer sees updated balance immediately
5. Email confirmation sent

### Reward Redemption
1. Customer views available rewards for a program
2. Merchant confirms redemption
3. Transaction recorded; balance updated on both sides
4. Email confirmation sent

## Release 1 Scope (In/Out)

### IN SCOPE
- Phone-based customer authentication (OTP via Better Auth Phone Number plugin)
- Email-based merchant authentication (via Better Auth)
- Stamp card programs (e.g., "Buy 10, Get 1 Free")
- Points programs (e.g., "1 purchase = 5 points")
- QR code scanning (with manual entry fallback)
- Basic dashboard for customers (balance, history, rewards)
- Basic dashboard for merchants (program management, customer overview)
- Email notifications (welcome, transaction, reward)
- Merchant self-service onboarding
- Admin interface (basic management)

### OUT OF SCOPE (Deferred to Future Releases)
- Multi-manager support (team member access)
- Delegated permissions (cashier, manager roles)
- NFC card scanning
- Advanced analytics and reporting
- API for third-party integrations
- Mobile apps (web-responsive only)
- Coupon/promotional campaigns
- Customer referral programs
- Tiered loyalty (VIP tiers, status levels)

## Key Constraints

- **Single Better Auth Instance:** One authentication system managing both customers (phone) and merchants (email), with capabilities determined by account table membership (customer_accounts, merchant_accounts)
- **Multi-Capability Support:** One person can be both a customer (earning rewards) and a merchant (managing programs)
- **Multi-tenant isolation:** Each merchant is a separate tenant; customers can join multiple programs but cannot see other merchants' data
- **Data security:** Row-level security (RLS) enforced at the database level
- **SMS support:** Tunisia +216 support required; vendor confirmation pending
- **Phone OTP:** Better Auth Phone Number plugin (official, production-ready) with external SMS provider integration
- **Account Separation:** No immutable userType field; table membership (customer_accounts, merchant_accounts) determines capabilities
- **Merchant Ownership:** Single merchant per account in Release 1; team features deferred
