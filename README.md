# FIDELIY: Digital Loyalty Platform

A loyalty and rewards platform for Tunisian SMBs: merchants create stamp and points programmes, customers carry one personal QR across businesses, and merchants scan it to award loyalty. Cash-based; no billing in Release 1.

## Status

Release 1 is in progress. Current state, verified facts and the next task are in `docs/IMPLEMENTATION_STATUS.md`; releases and backlog are in `docs/ROADMAP.md`.

## What it does

- **Customers:** join loyalty programmes with their phone number (a unique identifier, not OTP-verified in Release 1), keep a personal QR, and view balances, rewards and history.
- **Merchants:** set up a business, branches and programmes, scan customer QR codes to award stamps or points, and redeem rewards.
- **Admins:** platform oversight (basic, Release 1).

## Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Redux Toolkit (RTK Query); in-repo UI components |
| Backend | NestJS modular monolith, class-validator |
| Database | PostgreSQL 16 (Docker locally), Drizzle ORM and `pg`; Neon planned for deployment |
| Authentication | Better Auth: phone number for customers, email and password for merchants |
| Email | Resend |
| SMS / OTP | Deferred to Release 2 |

Decision history: `docs/DECISIONS.md`.

## Local development

Prerequisites: Node.js 22 (as in the Dockerfiles) and Docker. Create a root `.env` with the variables named in `.env.example` (never commit it). Real secret values are your own.

```powershell
# PostgreSQL and the backend (PowerShell; COMPOSE_BAKE avoids a .env BOM parsing issue)
$env:COMPOSE_BAKE = "false"
docker compose up -d --build backend

# Apply migrations (forward-only)
npm run db:migrate --prefix backend

# Frontend dev server (http://localhost:5173, proxies /api to the backend)
npm run dev --prefix frontend
```

Details and caveats (the local database role bypasses RLS) are in `docs/DATABASE.md`.

**Docker gotcha:** the frontend container keeps `node_modules` in a named volume, so a rebuild or restart does not install a newly added dependency (Vite then reports `Failed to resolve import`). Run `docker exec fideliy-frontend npm install` and restart the container (`docker restart fideliy-frontend`).

### Tests and checks

```bash
npm test --prefix backend            # Jest; database integration specs are opt-in via RUN_*_INTEGRATION=true
npm run lint --prefix backend        # tsc --noEmit
npm test --prefix frontend           # Vitest
npm run type-check --prefix frontend # tsc --noEmit
```

Integration specs need a running, migrated PostgreSQL. The flags are listed in `docs/ROADMAP.md` (testing evidence) and each spec under `backend/test/`.

## Documentation

- Product scope: `docs/PRODUCT.md`
- Architecture and API contracts: `docs/ARCHITECTURE.md`
- Database, RLS and migrations: `docs/DATABASE.md`
- Decisions: `docs/DECISIONS.md`
- Roadmap: `docs/ROADMAP.md`
- Current status: `docs/IMPLEMENTATION_STATUS.md`
- Design system and UI conventions: `docs/DESIGN_SYSTEM.md`
- Claude Code instructions: `CLAUDE.md`

## Release 1 scope

**In scope:** customer registration and sign-in by phone number (self-registration and merchant-assisted), merchant email and password authentication, stamp, points and combined programmes, QR scanning (with manual entry fallback), customer and merchant dashboards, basic admin, email notifications, redemption and corrections, multi-tenancy with RLS.

**Deferred:** multi-manager support, delegated permissions, NFC, advanced analytics, public API, mobile apps, billing and subscription enforcement, phone OTP verification.

See `docs/PRODUCT.md` for details.
