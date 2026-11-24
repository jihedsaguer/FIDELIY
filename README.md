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
| Database | PostgreSQL 16 (Docker locally), PostgreSQL 18 on Neon (deployment) and in CI; Drizzle ORM and `pg` |
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

### Local production-like smoke test

`docker-compose.prod.yml` runs the production images (backend `runtime` target, frontend `prod` target served by nginx, which proxies `/api/` like the Cloudflare Worker) with `NODE_ENV=production`, its own PostgreSQL volume and project name (`fideliy-prod`); it does not touch the dev stack. Use throwaway values only, in a file outside the repository (not the root `.env`):

```bash
ENVF="$(mktemp)"   # throwaway, outside the repo
node -e "const c=require('crypto');for(const k of ['POSTGRES_PASSWORD','BETTER_AUTH_SECRET','CUSTOMER_QR_SECRET'])console.log(k+'='+c.randomBytes(32).toString('hex'))" > "$ENVF"
# echo "SMOKE_HTTP_PORT=8088" >> "$ENVF"   # if port 8080 is taken

docker compose -f docker-compose.prod.yml --env-file "$ENVF" up -d --build
docker compose -f docker-compose.prod.yml --env-file "$ENVF" ps -a   # migrate: Exited (0); others healthy
curl -f http://localhost:8080/api/health
curl -f http://localhost:8080/merchant/login                         # SPA index.html
docker compose -f docker-compose.prod.yml --env-file "$ENVF" logs backend

docker compose -f docker-compose.prod.yml --env-file "$ENVF" down -v  # removes only postgres_prod_data
rm "$ENVF"
```

The stack sets `ALLOW_INSECURE_URLS_FOR_LOCAL_PROD=true` because production otherwise requires https `BETTER_AUTH_URL` / `FRONTEND_URL`; the flag only accepts http for localhost hosts and must never be set in a real deployment. Never run `down -v` on the dev `docker-compose.yml`.

### Tests and checks

```bash
npm test --prefix backend            # Jest; database integration specs are opt-in via RUN_*_INTEGRATION=true
npm run lint --prefix backend        # tsc --noEmit
npm test --prefix frontend           # Vitest
npm run type-check --prefix frontend # tsc --noEmit
```

Integration specs need a running, migrated PostgreSQL. The flags are listed in `docs/ROADMAP.md` (testing evidence) and each spec under `backend/test/`.

## Deployment (Neon + Render + Cloudflare)

Smoke/pilot deployment only: no real merchant data until the RLS hardening is done (`docs/DATABASE.md` section 4, DECISIONS #22).

- **Browser** -> Cloudflare Worker `fideliy` on workers.dev (`frontend/worker/index.ts`): serves the SPA and proxies `/api/*`, so auth cookies stay first-party.
- **Worker** -> Render web service (free tier), built from `backend/Dockerfile` (`runtime` stage).
- **Backend** -> Neon PostgreSQL 18 through the **pooled** connection string; migrations use the **direct** one.
- **GitHub Actions** deploys: `CI` (`.github/workflows/ci.yml`) on push to `main`, then `Deploy` (`.github/workflows/deploy.yml`): migrate Neon -> Render deploy (waits for `live` and `/api/health`) -> `wrangler deploy` -> smoke checks through the Worker.

GitHub environment `production` (names only; values never in the repository):

| Name | Kind | Value comes from |
|------|------|------------------|
| `NEON_MIGRATION_DATABASE_URL` | secret | Neon console, **direct** (non-pooled) connection string, `sslmode=verify-full` |
| `RENDER_API_KEY` | secret | Render, Account settings -> API keys |
| `RENDER_SERVICE_ID` | secret | Render service URL / settings (`srv-...`) |
| `CLOUDFLARE_API_TOKEN` | secret | Cloudflare, API token with Workers edit rights |
| `CLOUDFLARE_ACCOUNT_ID` | secret | Cloudflare dashboard |
| `BACKEND_ORIGIN` | variable | Render service URL, `https://<service>.onrender.com` (no path) |
| `FRONTEND_URL` | variable | Worker URL, `https://fideliy.<subdomain>.workers.dev` (no path) |

The `Deploy` workflow fails early, printing only the names, if any of them is empty or a URL is not https.

**Render service settings:** runtime Docker, root directory `backend` (Dockerfile `./Dockerfile`, default `runtime` stage), health check path `/api/health`, auto-deploy **Off** (only the workflow deploys). Environment variables: `NODE_ENV=production`, `DATABASE_URL` (Neon **pooled** string), `BETTER_AUTH_SECRET`, `CUSTOMER_QR_SECRET`, `BETTER_AUTH_URL` and `FRONTEND_URL` (both the Worker URL: the browser reaches auth through the Worker), `SMS_PROVIDER=none`. Do not set `PORT` (Render injects it) or `ALLOW_INSECURE_URLS_FOR_LOCAL_PROD`.

**First deploy:** create the Neon project, the Render service (settings above, auto-deploy off) and add the secrets/variables; then merge to `main` (or run `Deploy` manually from `main`). Migrations run before the backend deploy, so the first run creates the schema.

**Deploy / rollback:** every successful `CI` run on a push to `main` deploys that commit; `Deploy` can also be run manually from `main` with an optional `ref` (full SHA of a `main` commit) to redeploy an older version. Backend rollback: Render dashboard or a `ref` redeploy; Worker rollback: `npx wrangler rollback` in `frontend/`. The database is forward-only: migrations are never reversed, so each migration must stay compatible with the previous backend version.

**Free-tier caveats:** Render free services sleep after ~15 minutes without traffic (first request then takes up to about a minute) and share 750 instance hours per month per workspace; the Render filesystem is ephemeral, so uploaded business logos are lost on every deploy or restart; Neon scales to zero (first query after idle is slower; the pool timeout is 10 s). Neon runs PostgreSQL 18 (CI too), local Docker stays on 16.

### Keep-alive

A Cloudflare Workers Cron Trigger (`triggers.crons` in `frontend/wrangler.jsonc`, `*/10 * * * *`) runs the Worker's `scheduled` handler every 10 minutes. It sends one `GET ${BACKEND_ORIGIN}/api/health` (user-agent `fideliy-keepalive`, no cookies, 60 s timeout) so the Render free service does not sleep; failures are logged as one short line in the Worker logs and never retried. It is deployed with the Worker by the `Deploy` workflow (no extra secret). A Worker cron was chosen over a GitHub Actions `schedule`, which is best-effort (runs can be delayed past Render's 15-minute idle limit) and is disabled after 60 days without repository activity.

- **Turn it off:** set `"crons": []` in `frontend/wrangler.jsonc` and redeploy (or delete the cron in the Cloudflare dashboard, Worker -> Settings -> Triggers). Only deleting the key is not enough: `wrangler deploy` then leaves the deployed schedule in place.
- **Hours:** Render free gives 750 instance hours per month per workspace; one always-on service uses about 744 h in a 31-day month, so this fits **one** free service only.
- The pings count as traffic and keep the backend awake; `/api/health` does not query the database, so Neon still scales to zero.
- Worker cron timing is best-effort (usually within about a minute). This is not a substitute for a paid always-on instance; if in doubt, the owner should check Render's terms for the free plan.

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
