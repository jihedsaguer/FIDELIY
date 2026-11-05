# Technology Reuse & Resource Audit

This document records the evaluation of existing libraries, tools, services, and skills for FIDELIY Release 1.

## 1. Kiro Skills Evaluation

### Skill 1: supabase-postgres-best-practices ✅ APPROVED

**Type:** PostgreSQL optimization guide

**Maintained By:** Supabase Engineering

**Relevance to FIDELIY:**
- ✅ Query optimization (critical for transaction performance)
- ✅ RLS policies (core multi-tenancy architecture)
- ✅ Concurrency & locking (essential for loyalty transactions)
- ✅ Schema design (foundation for Release 1)
- ✅ Indexes & query performance (Phase 1D loyalty operations)

**Recommendation:** **LOAD THIS SKILL BEFORE:**
- Designing database schema (Phase 1A)
- Writing any SQL queries (Phase 1B onwards)
- Optimizing RLS policies (Phase 1A)
- Implementing atomic transactions (Phase 1D)

**Non-Applicable:** Supabase-specific auth features (we use PostgreSQL standard RLS)

**Assessment:** Essential skill; directly applicable to Release 1 requirements

---

### Skill 2: vercel-react-best-practices ✅ APPROVED (with Exclusions)

**Type:** React/Next.js performance optimization guide

**Maintained By:** Vercel Engineering

**Relevance to FIDELIY:**
- ✅ Bundle optimization (Vite handles this; still useful reference)
- ✅ Re-render optimization (component performance)
- ✅ Client-side data fetching (React Query patterns)
- ✅ Rendering performance (long list optimization)
- ✅ JavaScript optimization (general patterns)

**Non-Applicable to FIDELIY (Exclude):**
- ❌ Server-side rendering (we use SPA, not Next.js)
- ❌ API routes (separate NestJS backend)
- ❌ Next.js-specific features (Image, Middleware)
- ❌ Streaming/Suspense patterns specific to Next.js

**Recommendation:** **LOAD THIS SKILL DURING:**
- React component implementation (Phase 1E)
- Dashboard optimization (Phase 1E)
- Performance review before production (Phase 1F)

**Assessment:** Useful reference; exclude Next.js-specific rules; apply React-only patterns

---

### Skill 3: create-auth ⚠️ CONDITIONAL USE

**Type:** Better Auth scaffolding guide

**Maintained By:** Better Auth community

**Relevance to FIDELIY:**
- ✅ Better Auth NestJS integration patterns
- ✅ Email/password setup (merchant authentication)
- ✅ Session management
- ✅ Route handler setup

**Not Applicable (Exclude):**
- ❌ Phone authentication (Better Auth official Phone Number plugin, not covered by this skill)
- ❌ Phone OTP flows (requires reading official phone-number plugin docs directly)

**Recommendation:** **USE FOR:**
- Merchant email/password setup (Phase 1B)
- General Better Auth patterns
- NestJS integration structure

**DO NOT USE FOR:**
- Customer phone OTP implementation
- Multi-identity scenarios (use updated FIDELIY architecture instead)

**Assessment:** Partially applicable; use for merchant auth only; supplement with official Better Auth Phone Number plugin documentation for customers

---

## 2. Frontend Libraries

### Core Framework
- **React 18** — UI framework (APPROVED)
- **TypeScript** — Type safety (APPROVED)
- **Vite** — Build tool (APPROVED)

### UI Components & Styling
- **shadcn/ui** — Headless UI components (APPROVED for Phase 1E)
  - Customizable via Tailwind CSS
  - Full TypeScript support
  - Small bundle impact
  - Source code included (no vendor lock-in)

- **Tailwind CSS** — Utility-first CSS (APPROVED)
  - Paired with shadcn/ui
  - Fast styling iteration
  - Small production bundle

- **Radix UI** — Unstyled primitive components (built into shadcn/ui)

- **Lucide Icons** — Icon library (APPROVED)
  - SVG-based
  - Tree-shakeable

### Data Management
- **React Query (TanStack Query)** — Server state management (APPROVED)
  - Automatic caching
  - Background refetching
  - Deduplication
  - Perfect for API state

- **Zustand** — Client state management (APPROVED, alternative: Context API)
  - Lightweight
  - Simple API
  - Good for UI state (modals, dropdowns)

### Forms & Validation
- **React Hook Form** — Form state management (APPROVED)
  - Minimal re-renders
  - Native HTML validation
  - Small bundle

- **Zod** — Runtime validation (APPROVED)
  - TypeScript-first
  - Clear error messages
  - Converts to UI validation

### HTTP Client
- **Axios** — HTTP library (APPROVED)
  - Interceptors for auth/errors
  - Cancellation support
  - Promise-based

### Testing
- **Vitest** — Unit test framework (APPROVED)
  - Vite-native (fast)
  - Jest-compatible API
  - ESM support

- **@testing-library/react** — Component testing (APPROVED)
  - User-centric tests
  - Accessibility focus

### UI Notifications
- **Sonner** — Toast/notification library (APPROVED)
  - Simple API
  - Small bundle

### Utilities
- **clsx** — Conditional CSS classes (APPROVED)
- **date-fns** — Date formatting (APPROVED)
- **lodash-es** — Utility functions (APPROVED, minimize usage)

---

## 3. Backend Libraries

### Core Framework
- **NestJS** — Backend framework (APPROVED)
- **TypeScript** — Type safety (APPROVED)
- **node-postgres (pg)** — Postgres driver (APPROVED)

### Authentication
- **Better Auth** — Authentication framework (APPROVED)
  - Official Phone Number plugin (APPROVED)
  - Email/password provider (APPROVED)
  - Session management (APPROVED)

- **@thallesp/nestjs-better-auth** — NestJS integration (APPROVED)
  - Community-maintained
  - MIT license
  - Active maintenance
  - MIT Licensed: Yes

### ORM & Database
- **Drizzle ORM** — Type-safe ORM (APPROVED)
  - SQL-like queries
  - Migrations via Drizzle Kit
  - Full TypeScript support
  - Zero abstraction overhead

- **drizzle-kit** — Migration management (APPROVED)
  - Generate migrations from schema
  - Push to database
  - Introspect existing schema

### Email
- **Resend** — Email service (APPROVED)
  - SDK available
  - Transactional email focused
  - React email template support

### Validation
- **Zod** — Runtime validation (APPROVED)
  - DTOs with runtime checks
  - Error messages for API responses
  - Shareable between frontend and backend

- **class-validator** — Alternative (rejected in favor of Zod)

### Testing
- **Jest** — Test framework (APPROVED)
  - Standard in Node.js ecosystem
  - Good NestJS integration

- **supertest** — HTTP testing (APPROVED)
  - Test NestJS controllers

### Logging
- **Pino** — JSON logging (APPROVED)
  - Fast, minimal overhead
  - Structured logging for production
  - Good for observability

### Security
- **helmet** — HTTP headers security (APPROVED)
  - Set via NestJS middleware
  - Standard security headers

- **express-rate-limit** — Rate limiting (APPROVED)
  - Better Auth includes OTP rate limiting
  - API endpoint rate limiting via middleware

### Utilities
- **uuid** — UUID generation (APPROVED)
- **dotenv** — Environment variables (APPROVED)

---

## 4. Third-Party Services

### Authentication
- **Better Auth (Self-Hosted)** ✅ APPROVED
  - Type: Authentication framework
  - Cost: Free (MIT)
  - Phone Number Plugin: Official (production-ready)
  - Email/Password: Built-in
  - Status: Production-ready, maintained

### Email
- **Resend** ✅ APPROVED
  - Type: Transactional email API
  - Cost: ~$0.20 per 1,000 emails (free tier: 100/day)
  - Status: Production-ready
  - Evaluation: Simpler than SendGrid; good DX

### SMS Provider
- **SMS Provider Selection** ⏳ PENDING
  - Candidates: Twilio, Vonage, Infobip
  - Critical: Tunisia +216 support
  - Timeline: Phase 1A research
  - Integration: Via Better Auth Phone Number plugin's `sendOTP` callback

### Database
- **Supabase** ✅ APPROVED (Development)
  - Type: PostgreSQL + Infrastructure
  - Cost: Free tier sufficient for development
  - Status: Production-grade
  - Note: Use only standard PostgreSQL features (portable to Neon)

- **Neon** ✅ APPROVED (Production Alternative)
  - Type: Serverless PostgreSQL
  - Cost: ~$0.135/CPU hour (pay-per-use)
  - Status: Production-ready
  - Portability: Drizzle makes migration straightforward

### Hosting
- **Render** 🔄 PROPOSED
  - Type: Backend hosting
  - Cost: ~$7/month (basic) to $20+/month (production)
  - Status: Good NestJS support

- **Railway** 🔄 PROPOSED
  - Type: Backend hosting
  - Cost: ~$5-$20/month depending on usage
  - Status: Good developer experience

- **Cloudflare Pages** ✅ APPROVED (Frontend)
  - Type: Static hosting + CDN
  - Cost: Free tier sufficient
  - Status: Fast, reliable

---

## 5. Make vs. Buy Analysis

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Authentication** | BUY (Better Auth) | Security-critical; open-source; officially maintained |
| **Email Delivery** | BUY (Resend) | Reliability critical; Resend handles infrastructure |
| **SMS OTP** | BUY (provider TBD) | Compliance + reliability required; outsource |
| **Database** | BUY (PostgreSQL) | Data integrity critical; managed service (Supabase/Neon) |
| **Hosting** | BUY (Render/Railway) | Infrastructure management; focus on app logic |
| **Loyalty Logic** | MAKE (NestJS service) | Core business logic; unique to FIDELIY |
| **Dashboards** | MAKE (React UI) | Custom UX; unique to business requirements |
| **QR Generation** | BUY (qrcode library) | Standard, well-tested; simple integration |
| **Form Validation** | BUY (Zod) | Battle-tested; good DX |
| **Logging** | BUY (Pino) | Performance critical; well-maintained |

---

## 6. Licensing Verification

| Technology | License | Commercial Use | Verified |
|-----------|---------|-----------------|----------|
| React | MIT | ✅ Yes | ✅ |
| Vite | MIT | ✅ Yes | ✅ |
| NestJS | MIT | ✅ Yes | ✅ |
| Drizzle | Apache 2.0 | ✅ Yes | ✅ |
| Better Auth | MIT | ✅ Yes | ✅ |
| Resend | Commercial/Free | ✅ Yes | ✅ (free tier available) |
| PostgreSQL | PostgreSQL License | ✅ Yes | ✅ |
| Zod | MIT | ✅ Yes | ✅ |
| shadcn/ui | MIT | ✅ Yes | ✅ |
| Tailwind CSS | MIT | ✅ Yes | ✅ |
| Pino | MIT | ✅ Yes | ✅ |
| Supertest | MIT | ✅ Yes | ✅ |

**Conclusion:** All approved technologies are commercially usable under permissive licenses.

---

## 7. Dependencies Summary

### Frontend Dependencies (Approximate)
- React ecosystem: ~30 packages
- UI/styling: ~15 packages (shadcn/ui components)
- Forms/validation: ~8 packages
- Data fetching: ~5 packages
- Testing: ~12 packages
- **Total:** ~70 packages (tree-shaking minimizes bundle)

### Backend Dependencies (Approximate)
- NestJS core + plugins: ~25 packages
- Database: ~8 packages (Drizzle + pg)
- Auth: ~6 packages (Better Auth + NestJS wrapper)
- Validation: ~4 packages (Zod)
- Testing: ~8 packages
- Other: ~15 packages
- **Total:** ~66 packages

---

## 8. Performance Benchmarks (Phase 1A Baseline)

### Frontend
- Bundle size (minified + gzip): Target < 150 KB (React + UI libraries + app code)
- Initial page load: Target < 2s (LCP)
- Dashboard interactive: Target < 3s (TTI)

### Backend
- API response time (p95): Target < 200ms
- Database query time: Target < 50ms (for indexed queries)
- Transaction processing: Target < 1s (atomic loyalty transaction)

---

## 9. Future Technology Considerations (Phase 2+)

- **Caching Layer:** Redis for frequently accessed data (Phase 2C)
- **Connection Pooling:** PgBouncer for high concurrency (Phase 2C)
- **Message Queue:** Bull or RabbitMQ for async operations (Phase 2B)
- **Analytics:** PostHog or Mixpanel for user behavior (Phase 2B)
- **Monitoring:** Sentry for error tracking; DataDog for infrastructure (Phase 1F)
- **GraphQL:** Potential migration from REST (Phase 2+)

---

## 10. Dependency Management Rules (AGENTS.md)

All approved technologies in this audit:

1. ✅ Use pinned/exact versions (no `^` or `~` ranges)
2. ✅ Prefer MIT/Apache licenses for commercial use
3. ✅ Actively maintained (commits within last 6 months)
4. ✅ Large community or official backing
5. ✅ TypeScript support where relevant

**Dependency Review:** Update this audit after each major phase if new libraries are introduced.
