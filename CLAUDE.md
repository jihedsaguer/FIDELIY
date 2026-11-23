# FIDELIY — Claude Code Instructions

Tunisian-market digital loyalty SaaS (PWA replacing physical stamp cards). Existing project: continue, don't restart.

**Current state and next task:** `docs/IMPLEMENTATION_STATUS.md` — read first on every task, with `git status`.

## Product constraints (Release 1; never invent beyond these)
- Cash-based. No billing, subscription enforcement or plan limits (future monetization is deferred, not designed).
- Owner-focused: no employees, multi-manager or delegated access, NFC, advanced analytics, public API, mobile apps.
- Customer phone numbers are unique identifiers, NOT OTP-verified (self-registration and merchant-assisted); OTP is Release 2.
- One customer account and one personal QR across businesses; customers join via a business's public QR; merchants scan the customer QR to award loyalty.
- Requirements come from `docs/PRODUCT.md`, `docs/DECISIONS.md` or the user. Out-of-scope or ambiguous request: ask, don't assume.

## Stack and commands (verified)
React 19 + Vite + Tailwind 4 + RTK Query (`frontend/`); NestJS 12 + Drizzle + Better Auth (`backend/`); PostgreSQL 16 in Docker, Neon planned.
- Frontend: `cd frontend && npx tsc --noEmit`, `npx vitest run <file>`
- Backend: `npm test --prefix backend -- --runTestsByPath <file>`, `npm run lint --prefix backend` (tsc)
- DB-backed specs are opt-in (`RUN_*_INTEGRATION=true`) and need a migrated Postgres; migrations: `npm run db:migrate --prefix backend`
- Docker and local setup: `README.md`

## Workflow
1. Plan, get approval, implement with tests, verify, update `docs/IMPLEMENTATION_STATUS.md`. Agents: `planner` (read-only plan), `implementer` (approved plans), `debugger` (root cause before fix). Skip them for small tasks.
2. Reuse first: search for existing patterns and read the whole affected file and its consumers before editing.
3. Smallest complete change; no unrelated refactoring, renames or abstractions. Frontend-only tasks change no backend, DB or API contract.
4. Verify narrowly. Never claim browser, Docker or database runs you did not perform.
5. Report concisely: changed files, behaviour, evidence, tests, limitations, assumptions. Update existing docs; never create reports, summaries or handoff files.

## Docs (read only what the task needs)
`docs/PRODUCT.md` scope · `ARCHITECTURE.md` modules and API contracts · `DATABASE.md` schema, RLS, local DB · `DECISIONS.md` approved decisions (cite when relevant) · `ROADMAP.md` checkpoints and test evidence · `DESIGN_SYSTEM.md` UI.
Path-scoped rules in `.claude/rules/` load when you touch `backend/` or `frontend/`. Skills: `tdd` (test-first work), `web-design-guidelines` (UI/a11y review), `frontend-design` (manual only: `/frontend-design`).

## Safety
- Never read `.env*` contents. Never copy secret values; refer to variable names only.
- Never commit, push, stash, reset, clean, revert, stage or deploy without explicit approval. No bypass-permissions mode.
- The working tree often holds uncommitted user work (including tracked `frontend/dist/`); preserve it.
- Start a fresh session between unrelated tasks.
