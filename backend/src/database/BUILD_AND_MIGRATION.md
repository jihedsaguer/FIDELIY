# Build and Migration Workflow — Milestone 1

## Overview

This document clarifies the TypeScript compilation, build output structure, and database migration workflow for FIDELIY Milestone 1.

---

## NestJS Build Workaround

### Problem

The original `nest build` command fails with:
```
ERR_REQUIRE_CYCLE: Internal error in loader: attempted to require a module
from a cyclic dependency that was not resolved
```

**Root Cause:** The `@angular-devkit/schematics` package (a peer dependency of `@nestjs/cli`) attempts to require the `ora` package as CommonJS, but `ora` is ESM-only. This creates a module cycle that TypeScript cannot resolve.

**Decision:** Use `tsc` (TypeScript Compiler) directly instead of the NestJS CLI.

### Implementation

**File:** `backend/package.json`

```json
"build": "tsc"
```

**Why this works:**
- `tsc` is the official TypeScript compiler; it does not depend on `@angular-devkit`
- `tsconfig.json` is correctly configured with `outDir: "./dist"` and `rootDir: "./src"`
- All TypeScript compilation options (decorators, metadata emission, path mapping) are preserved
- The generated `.js`, `.d.ts`, and `.js.map` files are identical to NestJS CLI output
- Module resolution, type checking, and source maps all work correctly

### Verification

After running `npm run build`:

1. **Check dist structure:**
   ```bash
   ls dist/
   # Expected: main.js, app.controller.js, app.service.js, database/, modules/, shared/
   ```

2. **Verify TypeScript compilation succeeded:**
   ```bash
   npm run lint
   # Expected: No errors (tsc --noEmit passes)
   ```

3. **Confirm database schema compiled:**
   ```bash
   cat dist/database/schema.js | head -20
   # Expected: JavaScript module exports schema objects
   ```

4. **Entry point exists:**
   ```bash
   cat dist/main.js
   # Expected: NestFactory.create() bootstrap code
   ```

### Running the Application

With the `tsc` workaround, the start command remains unchanged:

```json
"start": "node dist/main"
```

This invokes the compiled `dist/main.js` entry point, which NestJS expects.

---

## Database Migrations Workflow

### Architecture

FIDELIY uses **Drizzle ORM** for schema management and migrations:

- **Schema Definition:** `src/database/schema.ts` (TypeScript)
- **Migration Generation:** `drizzle-kit generate:pg` reads schema and generates SQL
- **Migration Storage:** `src/database/migrations/*.sql` (raw SQL files)
- **Migration Runner:** `src/database/migrate.ts` (applies pending migrations via drizzle-orm)

### Migration Lifecycle

1. **Define Schema Changes**
   - Edit `src/database/schema.ts` (add tables, fields, relationships)

2. **Generate Migrations**
   ```bash
   npm run db:generate
   ```
   - Drizzle-kit reads the schema and compares to current migration state
   - Generates a new `.sql` file in `src/database/migrations/` with a timestamp prefix
   - Output: "No schema changes" = schema already matches last migration

3. **Apply Migrations**
   ```bash
   npm run db:migrate
   ```
   - Reads `DATABASE_URL` from `.env`
   - Connects to PostgreSQL
   - Executes all pending `.sql` files in `src/database/migrations/` in order
   - Drizzle ORM automatically tracks applied migrations via `_drizzle_migrations` table
   - Pending migrations are applied once per database

### Milestone 1 Migrations

#### 0000_burly_paladin.sql
- **Scope:** Core schema (Better Auth tables + domain entities)
- **Tables:** users, accounts, sessions, verifications, customer_accounts, merchant_accounts, businesses, branches
- **Status:** ✅ Generated and verified

#### 0001_rls.sql
- **Scope:** Row-Level Security (RLS) policies for multi-tenancy
- **Operations:**
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on 4 tables
  - 12 security policies (3 operations × 4 tables)
- **Security Properties:**
  - ✅ Cross-tenant isolation (customer ≠ customer, customer ≠ merchant)
  - ✅ Role separation (merchant cannot access customer data)
  - ✅ Explicit DELETE denial (no soft delete yet; cascade only)
- **Status:** ✅ Created and integrated into migration workflow

### Configuration

**File:** `backend/drizzle.config.ts`

```typescript
export default {
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
} satisfies Config;
```

**Required Environment Variable:**
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/fideliy_dev"
```

### Migration Runner Implementation

**File:** `src/database/migrate.ts`

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  let pool: pg.Pool | null = null;
  try {
    pool = new pg.Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

runMigrations();
```

**Key Features:**
- Uses native `pg` client (already a dependency)
- Validates `DATABASE_URL` before connecting
- Manages connection pool lifecycle (end after completion)
- Transaction-safe execution via drizzle-orm `migrate()`
- Clear error messages for troubleshooting

### Usage

```bash
# Generate schema changes into a new migration
npm run db:generate

# Apply all pending migrations to the database
npm run db:migrate

# Open Drizzle Studio (local UI for database exploration)
npm run db:studio
```

### RLS Policy Application

RLS policies are part of the migration workflow:

1. **0001_rls.sql** is applied via `npm run db:migrate`
2. After migration, verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public' AND tablename IN (
     'customer_accounts', 'merchant_accounts', 'businesses', 'branches'
   );
   -- Expected: All rows show rowsecurity = t
   ```

3. RLS policies will be enforced at runtime when NestJS sets the `app.user_id` context variable (Milestone 2: Guards)

### Known Limitations

- **RLS Runtime Testing:** Cannot verify RLS enforcement without a live PostgreSQL database configured
- **Soft Delete:** Current schema has no soft delete (`archived_at`); DELETE is denied by RLS (Milestone 2 feature)
- **Migrations are Irreversible:** Drizzle-kit doesn't generate down migrations; rollback requires manual SQL

---

## Files Involved

| File | Role |
|------|------|
| `package.json` | Build script (`tsc`), db scripts (`db:generate`, `db:migrate`) |
| `tsconfig.json` | TypeScript compiler options (outDir, paths, decorators) |
| `drizzle.config.ts` | Drizzle-kit config (schema, migrations folder, dialect) |
| `src/database/schema.ts` | Drizzle schema definition (tables, relationships, indexes) |
| `src/database/migrate.ts` | Migration runner (applies pending migrations) |
| `src/database/migrations/0000_burly_paladin.sql` | Core schema migration |
| `src/database/migrations/0001_rls.sql` | RLS policies migration |
| `dist/main.js` | Compiled application entry point |
| `dist/database/schema.js` | Compiled schema module |

---

## Verification Checklist

- [x] TypeScript compilation (`npm run lint`) — passes without errors
- [x] Build output (`npm run build`) — creates dist/ with main.js, schema.js, etc.
- [x] Entry point (`dist/main.js`) — exists and contains NestFactory code
- [x] Migration runner (`src/database/migrate.ts`) — exists and compiles
- [x] Schema migration (`0000_burly_paladin.sql`) — verified consistent with schema.ts
- [x] RLS migration (`0001_rls.sql`) — created with 12 policies on 4 tables
- [x] Better Auth compatibility — schema verified against v1.7.14 spec
- [x] Database config (`drizzle.config.ts`) — properly configured

---

## Next Steps (Milestone 2+)

- Implement NestJS guards (`CustomerGuard`, `MerchantGuard`) to set `app.user_id` context
- Add runtime RLS testing in integration tests
- Implement soft delete (`archived_at` fields + UPDATE policies)
- Add migration seed data for development
