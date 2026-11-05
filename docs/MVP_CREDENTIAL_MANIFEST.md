# FIDELIY MVP Credential and Integration Manifest

**Date:** November 1, 2026  
**Scope:** Release 1 MVP - Local Development & Staging Preparation  
**Architecture Reference:** `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`

---

## Integration Inventory

### 1. Better Auth (Authentication & Session Management)

| Field | Value |
|-------|-------|
| **Integration** | Better Auth (Official Framework) |
| **Purpose** | Canonical user identity, phone OTP for customers, email/password for merchants, session management |
| **Environment Variable** | `BETTER_AUTH_SECRET` |
| **Secret Classification** | Secret (cryptographic key) |
| **Required Environment** | Local, Staging, Production |
| **Acquisition Procedure** | Generate via: `crypto.randomBytes(32).toString('hex')` (JavaScript) or `openssl rand -hex 32` (CLI) |
| **Current Status** | Available (package installed: `better-auth@^1.7.14`) |
| **Implementation Dependency** | Auth module (merchant email/password setup, customer phone OTP setup) |
| **Configuration Location** | `backend/src/modules/auth/better-auth.config.ts` |
| **Notes** | Phone Number plugin (official) for customers; email/password provider for merchants; single instance with no separate identity system |

**Required Credentials:**
- `BETTER_AUTH_SECRET`: 64-character hex string (generated, never from external service)

**Not Required:**
- OAuth client IDs/secrets (Release 1 excludes OAuth)
- Custom JWT keys (Better Auth manages internally)

**Status Check Command:**
```bash
npm list better-auth  # Should show ^1.7.14
```

---

### 2. PostgreSQL Database

| Field | Value |
|-------|-------|
| **Integration** | PostgreSQL (Supabase dev, Neon production alternative) |
| **Purpose** | Core data storage, ACID transactions, RLS multi-tenancy |
| **Environment Variables** | `DATABASE_URL`, `MIGRATION_DATABASE_URL` (if needed) |
| **Secret Classification** | Secret (connection string contains password) |
| **Required Environment** | Local (via Docker), Staging, Production |
| **Acquisition Procedure** | Local: Docker PostgreSQL; Cloud: Supabase project or Neon account |
| **Current Status** | Partially available (Drizzle ORM installed; migrations defined; no running instance yet) |
| **Implementation Dependency** | All modules (users, customers, merchants, programs, loyalty, admin) |
| **Configuration Location** | `backend/src/database/` (schema.ts, migrations/, database.service.ts) |
| **Notes** | Drizzle ORM abstracts provider; portable between Supabase and Neon |

**Required Credentials:**
- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://user:password@host:port/dbname`)
- `MIGRATION_DATABASE_URL`: Optional separate migration connection (use same as DATABASE_URL for MVP)

**Local Setup (Docker):**
```bash
docker run -d \
  --name fideliy-postgres \
  -e POSTGRES_USER=fideliy_dev \
  -e POSTGRES_PASSWORD=<random-password> \
  -e POSTGRES_DB=fideliy_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

**Connection String Template:**
```
postgresql://fideliy_dev:<password>@localhost:5432/fideliy_dev
```

**Status Check Command:**
```bash
npm run db:generate  # Should create migration files
npm run db:migrate   # Should execute migrations against running DB
```

---

### 3. Resend (Transactional Email)

| Field | Value |
|-------|-------|
| **Integration** | Resend (Official SaaS API) |
| **Purpose** | Merchant email verification, password resets, transactional notifications |
| **Environment Variable** | `RESEND_API_KEY` |
| **Secret Classification** | Secret (API key) |
| **Required Environment** | Staging, Production (optional for local dev with fallback) |
| **Acquisition Procedure** | Create account at resend.com; generate API key from dashboard |
| **Current Status** | Not yet configured (package installed: `resend@^6.37.0`) |
| **Implementation Dependency** | Auth module (merchant email verification), Loyalty module (redemption notifications) |
| **Configuration Location** | Pending implementation |
| **Notes** | Not required for local development; can mock or use development mode; provide actual key for staging/production |

**Required Credentials:**
- `RESEND_API_KEY`: Alphanumeric API key (minimum ~30 characters)

**Optional Credentials:**
- `RESEND_WEBHOOK_SECRET`: Only if webhook integration required (not in MVP scope)
- `EMAIL_FROM`: Sender email address (default: `no-reply@resend.com` or configured in Resend dashboard)

**Development Fallback:**
- Use console logging for email in local development (no Resend key needed)
- Mock implementation available in shared utilities

**Resend Account Setup:**
1. Go to https://resend.com
2. Sign up with email
3. Create a project
4. Generate API key
5. Copy key to local `.env` file

**Status:** External service not yet connected; will be configured before staging

---

### 4. SMS Provider (Phone OTP for Customers)

| Field | Value |
|-------|-------|
| **Integration** | Pending vendor selection (Twilio, Vonage, or Infobip) |
| **Purpose** | Send OTP codes to customers during phone-based registration and sign-in |
| **Environment Variables** | `SMS_PROVIDER`, provider-specific variables (pending) |
| **Secret Classification** | Secret (API key or auth token) |
| **Required Environment** | Staging, Production (local dev uses mock via console logging) |
| **Acquisition Procedure** | Select vendor; create account; generate API credentials; integrate via Better Auth Phone Number plugin's `sendOTP` callback |
| **Current Status** | Mock SMS provider active in local development; real vendor selection pending |
| **Implementation Dependency** | Auth module (customer phone verification) |
| **Configuration Location** | `backend/src/modules/auth/better-auth.config.ts` |
| **Notes** | Must support Tunisia (+216); no active SMS provider selected yet |

**Local Development (Current):**
- Environment variable: `SMS_PROVIDER=mock`
- Behavior: OTP codes logged to console instead of sent via SMS
- Example output: `📱 [DEV] OTP Code: 123456 sent to +216XXXXXXXX`

**Production Requirement:**
- `SMS_PROVIDER` must be set to actual vendor name (not "mock")
- Vendor-specific API key required
- Application startup will fail if `NODE_ENV=production` and `SMS_PROVIDER=mock`

**Vendor Selection Timeline:**
- **Phase 1A:** Research and validate Tunisia (+216) support with Twilio, Vonage, Infobip
- **Phase 1B (Week 4):** Select vendor; obtain credentials
- **Phase 1C:** Integrate with Better Auth Phone Number plugin

**Placeholder Vendor Candidates:**
- Twilio: Known SMS provider; supports Tunisia
- Vonage (Nexmo): International coverage; competitive pricing
- Infobip: African coverage; strong in emerging markets

**Status:** Pending vendor selection; mock provider active; real integration blocked until vendor confirmed

---

## Environment Variables Summary

### Required for Local Development

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `BETTER_AUTH_SECRET` | Secret | `a1b2c3d4...` (32 bytes hex) | Generate once; reuse for dev |
| `DATABASE_URL` | Secret | `postgresql://user:pass@localhost/db` | Local Docker PostgreSQL |
| `NODE_ENV` | Config | `development` | Set for local dev |
| `PORT` | Config | `3000` | NestJS backend port |
| `FRONTEND_URL` | Config | `http://localhost:5173` | React Vite frontend URL |

### Optional for Local Development

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `RESEND_API_KEY` | Secret | (not needed) | Use mock/console for local dev |
| `SMS_PROVIDER` | Config | `mock` | Keep as "mock" for local dev |
| `LOG_LEVEL` | Config | `debug` | Verbosity control |

### Required for Staging/Production

| Variable | Type | Source | Notes |
|----------|------|--------|-------|
| `BETTER_AUTH_SECRET` | Secret | Generate & store securely | Stable across environments |
| `DATABASE_URL` | Secret | Supabase or Neon | Staging/prod database |
| `RESEND_API_KEY` | Secret | Resend dashboard | Actual transactional email |
| `SMS_PROVIDER` | Config | Vendor name | Must NOT be "mock" |
| `SMS_VENDOR_API_KEY` | Secret | Vendor dashboard | Provider-specific credentials |
| `NODE_ENV` | Config | `production` | Enables strict validation |

---

## `.env.example` Template

```bash
# ============================================================================
# BETTER AUTH
# ============================================================================
# Generate with: crypto.randomBytes(32).toString('hex')
BETTER_AUTH_SECRET=<generate-with-crypto.randomBytes(32).toString('hex')>

# ============================================================================
# DATABASE - PostgreSQL
# ============================================================================
# Local: postgresql://fideliy_dev:password@localhost:5432/fideliy_dev
# Supabase: postgresql://postgres.[project-id]:[password]@db.[project-id].supabase.co:5432/postgres
# Neon: postgresql://[user]:[password]@[project].neon.tech/[database]
DATABASE_URL=postgresql://fideliy_dev:password@localhost:5432/fideliy_dev

# Optional: separate connection for migrations (use DATABASE_URL if not set)
# MIGRATION_DATABASE_URL=postgresql://...

# ============================================================================
# EMAIL - Resend (Optional for local development; required for staging/production)
# ============================================================================
# Get from: https://resend.com/api-keys
# RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Optional: sender email address
# EMAIL_FROM=noreply@fideliy.tn

# ============================================================================
# SMS PROVIDER
# ============================================================================
# Local development: keep as "mock" (logs OTP codes to console)
# Staging/Production: set to actual vendor name (e.g., "twilio", "vonage", "infobip")
SMS_PROVIDER=mock

# Pending vendor selection; add when SMS provider is chosen:
# SMS_VENDOR_API_KEY=<vendor-specific-key>
# SMS_SENDER_ID=<vendor-specific-sender-id>

# ============================================================================
# NODE ENVIRONMENT
# ============================================================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug

# ============================================================================
# CORS & SECURITY
# ============================================================================
# CORS_ORIGIN=http://localhost:5173
# API_PUBLIC_URL=http://localhost:3000

# ============================================================================
# VITE (Frontend Public Configuration)
# ============================================================================
# Note: VITE_ variables are compiled into frontend bundle at build time
# VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Implementation Status

### Available (Can Use Immediately)

✅ **Better Auth**
- Package installed
- Configuration template ready (`better-auth.config.ts`)
- Phone Number plugin available
- Email/password provider available
- No external setup needed; only requires `BETTER_AUTH_SECRET` generation

✅ **PostgreSQL + Drizzle ORM**
- Drizzle ORM installed
- Schema fully defined (users, accounts, sessions, verifications, customer_accounts, merchant_accounts, businesses, branches)
- Migrations template available
- Ready for Docker PostgreSQL or Supabase connection

✅ **Frontend React + Vite**
- React 18 installed
- Vite configured
- TypeScript ready

### Missing (Requires Setup Before Integration)

⏳ **Resend API Key**
- Package installed (`resend@^6.37.0`)
- No account or API key yet
- Can proceed with local dev without it (mock email implementation)
- Will be required for staging/production

⏳ **SMS Provider Credentials**
- Mock SMS provider active (logs to console)
- Real vendor not selected
- Blocks staging/production phone verification
- Timeline: Select by end of Phase 1A

⏳ **PostgreSQL Instance (Local)**
- Docker instructions provided above
- Not yet running
- Will be provisioned during setup phase

### Not Required (Out of MVP Scope)

❌ **OAuth Providers** (Google, GitHub, Facebook)
- Deferred to Phase 2
- Not implemented in current architecture

❌ **Object Storage** (S3, CloudFlare R2)
- No file uploads in Release 1
- Deferred to Phase 2

❌ **Payment Processing** (Stripe, PayPal)
- Release 1 uses loyalty currencies (stamps, points)
- No real payments; deferred to Phase 2

❌ **Analytics** (Mixpanel, Segment)
- Basic metrics only; full analytics deferred to Phase 2

❌ **Hosting Platform Specific** (Render, Railway, Fly.io)
- Selected during Phase 1A
- Not needed for local development

---

## Secret Management Rules

### Never Commit to Git
- `.env` (local development secrets)
- `.env.local` (local overrides)
- `.env.production` (production secrets)
- Any file with API keys, tokens, or connection strings

### Already in `.gitignore`
- `.env` (confirmed)
- Other secret files (verify in repo)

### Safe to Commit
- `.env.example` (uses placeholders only)
- Configuration files without secrets
- Schema and migration files

### Generation Process
1. **BETTER_AUTH_SECRET**: `openssl rand -hex 32`
2. **DATABASE_URL**: Obtain from Docker/Supabase/Neon, don't commit
3. **RESEND_API_KEY**: Obtain from Resend dashboard, don't commit
4. **SMS Vendor Keys**: Obtain from vendor, don't commit

---

## Next Steps (Ordered)

### Immediate (Before Local Development)
1. ✅ Generate `BETTER_AUTH_SECRET` (2 minutes)
2. ⏳ Start Docker PostgreSQL container (2 minutes)
3. ⏳ Create `.env` file from `.env.example` (1 minute)
4. ⏳ Run `npm run db:migrate` to initialize schema (2 minutes)
5. ⏳ Verify application starts: `npm run start:dev` (1 minute)

### Before Staging
1. ⏳ Create Supabase project and obtain `DATABASE_URL`
2. ⏳ Select SMS vendor (Twilio/Vonage/Infobip)
3. ⏳ Obtain SMS vendor API credentials
4. ⏳ Create Resend account and obtain `RESEND_API_KEY`
5. ⏳ Test email and SMS integrations end-to-end

### Before Production
1. ⏳ Review all secrets are environment-variable injected
2. ⏳ Verify `NODE_ENV=production` validation logic (SMS mock rejection)
3. ⏳ Set up production database (Neon or other)
4. ⏳ Configure production secrets in deployment platform
5. ⏳ Test production authentication and email flows

---

## Local Development Quick Start

```bash
# 1. Generate secret
BETTER_AUTH_SECRET=$(openssl rand -hex 32)

# 2. Start Docker PostgreSQL
docker run -d \
  --name fideliy-postgres \
  -e POSTGRES_USER=fideliy_dev \
  -e POSTGRES_PASSWORD=devpass123 \
  -e POSTGRES_DB=fideliy_dev \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Create .env
cat > .env << EOF
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
DATABASE_URL=postgresql://fideliy_dev:devpass123@localhost:5432/fideliy_dev
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SMS_PROVIDER=mock
LOG_LEVEL=debug
EOF

# 4. Install dependencies
npm install
npm install -D  # Backend devDependencies

# 5. Run migrations
npm run db:migrate

# 6. Start dev server
npm run start:dev
```

---

## Sign-Off

| Item | Status | Responsible |
|------|--------|-------------|
| Credential manifest created | ✅ Complete | Agent |
| Secret handling documented | ✅ Complete | Agent |
| Local development path defined | ✅ Complete | Agent |
| Next actions enumerated | ✅ Complete | Agent |
| User action: Generate BETTER_AUTH_SECRET | ⏳ Pending | User |
| User action: Start Docker PostgreSQL | ⏳ Pending | User |
| User action: Create `.env` file | ⏳ Pending | User |
| User action: Run migrations | ⏳ Pending | User |
| User action: Verify application startup | ⏳ Pending | User |
| User action: Select SMS vendor (Phase 1A) | ⏳ Pending | User |

