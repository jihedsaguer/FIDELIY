# Phase 1A Setup Guide

## Status: M1 & M2 Complete ✅

The backend (NestJS 8-module) and frontend (React+Vite) scaffolds are complete. **Next steps require your action.**

---

## Before You Continue

### 1. Create a Supabase Development Project

1. Go to https://supabase.com/ and sign up (free tier available)
2. Create a new project
   - **Project Name:** `fideliy-dev` (or your preference)
   - **Region:** Choose nearest to your location
   - **Database Password:** Generate and save securely
3. Once created, navigate to **Project Settings** → **Database** → **Connection String**
4. Copy the `URI` connection string (looks like: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres`)

### 2. Generate Better Auth Secret

Run this in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (long hex string).

### 3. Create `.env` File

At the workspace root (`c:\Users\Mon Pc\Desktop\FIDELIY\.env`), create:

```env
# Better Auth
BETTER_AUTH_SECRET=<paste-your-hex-string-from-step-2>

# Database (Supabase)
DATABASE_URL=<paste-your-connection-string-from-step-1>

# Email (optional for Phase 1A, required for M5)
# RESEND_API_KEY=<not-yet-needed>

# Node Environment
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug
```

### 4. Verify Backend Build

```powershell
cd backend
npm run lint
```

Should output: ✅ **zero errors**

### 5. (Optional) Verify Frontend Build

```powershell
cd frontend
npm run type-check
```

Should output: ✅ **zero errors**

---

## What's Ready

### Backend (`backend/`)
- ✅ NestJS 8-module structure
- ✅ DatabaseService (Drizzle + pool management)
- ✅ TenantContextService (RLS context)
- ✅ Health endpoints (`GET /health`, `GET /`)
- ⏳ Database schema (M3)
- ⏳ Better Auth integration (M4-M5)

### Frontend (`frontend/`)
- ✅ React 19 + Vite setup
- ✅ TypeScript configuration
- ✅ API proxy configured (`:5173 → :3000`)
- ⏳ Auth UI (M4-M5)
- ⏳ Dashboard UI (Phase 1B+)

### Root Workspace
- ✅ `.env.example` template
- ✅ npm scripts for monorepo management
- ✅ Git ready

---

## Next: Milestone M3

Once you've completed steps 1-3 above, I'll proceed with **M3: Database Schema & RLS Policies**:

1. Create Drizzle schema for 10 tenant-scoped tables
2. Create PostgreSQL RLS policies
3. Create `fideliy_rls_owner` role + SECURITY DEFINER functions
4. Set up Drizzle migrations
5. Test RLS isolation

**Estimated time:** ~2 hours

---

## Commands to Know

```bash
# From workspace root:

# Install everything
npm run install:all

# Run backend + frontend (separate terminals):
npm run dev:backend    # Terminal 1: Backend at :3000
npm run dev:frontend   # Terminal 2: Frontend at :5173

# Or combined (requires bash or separate processes):
npm run dev

# Build for production
npm run build

# Test backend
npm test --prefix backend
```

---

## Questions?

Refer to approved docs:
- **Architecture:** `docs/ARCHITECTURE.md`
- **Database:** `docs/DATABASE.md`
- **Product Spec:** `docs/PRODUCT.md`
- **Decisions:** `docs/DECISIONS.md`
- **Development Guidelines:** `AGENTS.md`

---

## Ready to Continue?

Once `.env` is configured with `DATABASE_URL` and `BETTER_AUTH_SECRET`:

```bash
# In workspace root, run:
cd backend
npm run lint
```

Tell me the result, and I'll begin **M3: Database Schema & RLS Policies**.
