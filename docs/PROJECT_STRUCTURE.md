# Project Structure & Organization

## Backend Structure (NestJS)

```
backend/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── features/
│   │   ├── auth/                        # Better Auth integration and validation
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── session.service.ts
│   │   │   └── index.ts
│   │   ├── customers/
│   │   │   ├── customers.controller.ts
│   │   │   ├── customers.module.ts
│   │   │   └── index.ts
│   │   ├── merchants/
│   │   │   ├── merchants.controller.ts
│   │   │   ├── merchants.module.ts
│   │   │   └── index.ts
│   │   ├── programs/
│   │   │   ├── programs.module.ts
│   │   │   └── index.ts
│   │   ├── loyalty/
│   │   │   └── loyalty.module.ts
│   │   ├── admin/
│   │   │   └── admin.module.ts
│   │   └── index.ts                    # Optional barrel file for feature exports
│   │
│   ├── shared/                         # Cross-feature infrastructure
│   │   ├── guards/
│   │   ├── middleware/
│   │   ├── database/
│   │   ├── utils/
│   │   └── shared.module.ts
│   │
│   ├── database/                       # Current schema and migration entry point
│   │   ├── schema.ts                   # Existing central schema source
│   │   ├── database.module.ts
│   │   └── migrations/
│   │
│   └── config/                         # Environment and runtime config
│
│   │
│   ├── database/                        # Drizzle ORM schema & migrations
│   │   ├── schema.ts                    # All table definitions
│   │   ├── migrations/
│   │   │   ├── 0001_initial_schema.sql
│   │   │   ├── 0002_rls_policies.sql
│   │   │   └── ...
│   │   └── seed.ts                      # Development seeding
│   │
│   └── config/
│       ├── database.config.ts           # Drizzle config
│       ├── auth.config.ts               # Better Auth setup
│       └── env.validation.ts            # Environment variable validation
│
├── .env.example                          # Template environment variables
├── package.json
├── tsconfig.json
├── drizzle.config.ts                    # Drizzle Kit configuration
└── docker-compose.yml                   # Optional: PostgreSQL + PgBouncer for local dev
```

## Frontend Structure (React + Vite)

```
frontend/
├── src/
│   ├── main.tsx                         # React root and providers
│   ├── app/
│   │   ├── store.ts                     # Redux store and RTK Query middleware
│   │   ├── hooks.ts                     # Typed Redux hooks
│   │   ├── providers.tsx                # Redux and auth providers
│   │   └── routes/
│   │       ├── index.tsx                # URL-to-page mapping and lazy imports
│   │       ├── paths.ts                 # Central route paths
│   │       └── RouteGuards.tsx          # Session and capability checks
│   ├── services/api/baseApi.ts          # Credentialed RTK Query base API
│   ├── components/
│   │   ├── layout/PublicLayout.tsx
│   │   └── ui/                          # Shared feedback, loading, and buttons
│   ├── features/
│   │   ├── auth/                        # Session, OTP and merchant sign-in
│   │   │   ├── api/authApi.ts
│   │   │   ├── pages/
│   │   │   ├── types/auth.types.ts
│   │   │   └── AuthProvider.tsx
│   │   ├── business-onboarding/         # Guided merchant setup
│   │   │   ├── api/businessOnboardingApi.ts
│   │   │   ├── components/OnboardingStepForm.tsx
│   │   │   ├── pages/
│   │   │   ├── styles/business-onboarding.css
│   │   │   └── types/businessOnboarding.types.ts
│   │   ├── merchant/
│   │   │   ├── api/merchantApi.ts
│   │   │   ├── pages/MerchantDashboardPage.tsx
│   │   │   └── types/merchant.types.ts
│   │   └── customer/pages/CustomerDashboardPage.tsx
│   ├── styles/global.css
│   └── test-utils/
├── package.json
└── vite.config.ts
```

Server state and requests are managed by RTK Query endpoint definitions injected into the shared `baseApi`; the store registers its reducer and middleware once. Authentication and business setup use Better Auth cookies and the existing `/api` Vite proxy. Onboarding step state remains local to its page, so there is no duplicate server data or unnecessary feature slice.

## API Response Format (Backend)

All API responses follow this structure:

```typescript
// Success
{
  "success": true,
  "data": { /* resource or resources */ },
  "meta": {
    "timestamp": "2025-01-01T12:00:00Z",
    "version": "1.0"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Phone number format invalid",
    "details": { /* optional additional context */ }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00Z",
    "requestId": "req_xyz"  // For debugging
  }
}
```

## Error Codes (Backend)

| Code | HTTP Status | Description |
|------|-----------|---|
| `INVALID_REQUEST` | 400 | Malformed request or validation error |
| `UNAUTHORIZED` | 401 | Session invalid or missing |
| `FORBIDDEN` | 403 | User lacks permission (role/tenant) |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate enrollment) |
| `UNPROCESSABLE` | 422 | Business logic violation (e.g., insufficient balance) |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Development Workflow

### Backend Setup
```bash
cd backend
npm install
npx drizzle-kit generate       # Create initial migration
npx drizzle-kit push           # Apply to Supabase
npm run dev                    # Start dev server (localhost:3001)
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev                    # Start dev server (localhost:5173)
```

### Database Access (Development)
```bash
# Via Supabase UI: https://app.supabase.com
# Or via psql if local:
psql $DATABASE_URL -c "SELECT * FROM customers;"
```

## Naming Conventions

### TypeScript/JavaScript
- `camelCase` for variables, functions, methods
- `PascalCase` for classes, types, interfaces, enums
- `UPPER_SNAKE_CASE` for constants
- Prefix booleans with `is`, `has`, `can` (e.g., `isVerified`, `hasPermission`)

### Database Tables
- `snake_case` for table and column names
- Singular table names (e.g., `customer`, `transaction`, not `customers`, `transactions`)
- Foreign key: `{singular_table}_id` (e.g., `customer_id`, `program_id`)
- Timestamps: `created_at`, `updated_at`, `deleted_at`

### API Endpoints
- RESTful: `/api/v1/resource` (e.g., `/api/v1/customers/me`)
- GET for read, POST for create, PATCH for update, DELETE for remove
- No verbs in URL (use HTTP methods instead)

### Files & Folders
- Feature folders: `kebab-case` (e.g., `customer-dashboard`)
- Component files: `PascalCase.tsx` (e.g., `ProgramCard.tsx`)
- Utility files: `camelCase.ts` (e.g., `formatPhoneNumber.ts`)
- Config files: `kebab-case.config.ts` (e.g., `drizzle.config.ts`)

## Testing Organization

```
backend/
├── src/
│   └── ... (source code)
├── test/
│   ├── unit/
│   │   ├── loyalty.service.spec.ts
│   │   ├── programs.service.spec.ts
│   │   └── ...
│   ├── integration/
│   │   ├── rls-isolation.spec.ts       # Multi-tenant tests
│   │   ├── earning-redemption.spec.ts  # Transaction tests
│   │   └── ...
│   └── fixtures/
│       └── seeding.ts
└── jest.config.js

frontend/
├── src/
│   └── ... (source code)
├── test/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── vitest.config.ts
```
