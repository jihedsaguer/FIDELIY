# Project Structure & Organization

## Backend Structure (NestJS)

```
backend/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── modules/
│   │   ├── auth/                        # Authentication & Better Auth integration
│   │   │   ├── auth.controller.ts       # Routes: phone verify, email verify, password reset
│   │   │   ├── auth.service.ts          # Better Auth setup, session validation
│   │   │   ├── phone-otp.service.ts     # Phone OTP logic (sendOTP callback setup)
│   │   │   ├── guards/
│   │   │   │   ├── customer.guard.ts    # @UseGuards(CustomerGuard) - validates phone verification
│   │   │   │   ├── merchant.guard.ts    # @UseGuards(MerchantGuard) - validates email verification
│   │   │   │   └── index.ts             # Guard exports
│   │   │   ├── decorators/
│   │   │   │   ├── session.decorator.ts # @Session() to inject current session
│   │   │   │   └── user-type.decorator.ts # @UserType() to inject userType
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── customers/                   # Customer domain
│   │   │   ├── customers.controller.ts  # Routes: GET /customers/me, POST /customers/:id/profile
│   │   │   ├── customers.service.ts     # Customer business logic
│   │   │   ├── dto/
│   │   │   │   ├── create-customer.dto.ts
│   │   │   │   └── update-profile.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── customer.entity.ts   # Drizzle schema (customers table)
│   │   │   ├── repository/
│   │   │   │   └── customers.repository.ts # Data access layer
│   │   │   └── customers.module.ts
│   │   │
│   │   ├── merchants/                   # Merchant domain
│   │   │   ├── merchants.controller.ts
│   │   │   ├── merchants.service.ts
│   │   │   ├── dto/
│   │   │   ├── entities/                # merchants, businesses, branches tables
│   │   │   ├── repository/
│   │   │   └── merchants.module.ts
│   │   │
│   │   ├── programs/                    # Loyalty program configuration
│   │   │   ├── programs.controller.ts   # Routes: POST /programs, GET /programs/:id
│   │   │   ├── programs.service.ts      # Program CRUD
│   │   │   ├── dto/
│   │   │   ├── entities/                # programs, rewards tables
│   │   │   ├── repository/
│   │   │   └── programs.module.ts
│   │   │
│   │   ├── loyalty/                     # Core loyalty operations
│   │   │   ├── loyalty.controller.ts    # Routes: POST /earn, POST /redeem
│   │   │   ├── loyalty.service.ts       # Coordinates earning/redemption
│   │   │   ├── earning/
│   │   │   │   ├── earning.service.ts   # Stamp/point calculation & award
│   │   │   │   └── earning.repository.ts
│   │   │   ├── redemption/
│   │   │   │   ├── redemption.service.ts # Redemption processing & validation
│   │   │   │   └── redemption.repository.ts
│   │   │   ├── balances/
│   │   │   │   ├── balances.service.ts  # Current balance queries
│   │   │   │   └── balances.repository.ts
│   │   │   ├── dto/
│   │   │   ├── entities/                # transactions, balances, redemptionCodes tables
│   │   │   └── loyalty.module.ts
│   │   │
│   │   ├── admin/                       # Platform administration
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── dto/
│   │   │   └── admin.module.ts
│   │   │
│   │   └── shared/                      # Cross-module utilities
│   │       ├── guards/                  # (duplicate export for convenience)
│   │       ├── filters/
│   │       │   └── http-exception.filter.ts # Global error handling
│   │       ├── decorators/
│   │       ├── middleware/
│   │       │   └── rls-context.middleware.ts # Set RLS context from session
│   │       ├── database/
│   │       │   ├── db.ts               # Drizzle db instance
│   │       │   └── rls.service.ts      # RLS context helpers
│   │       ├── utils/
│   │       │   ├── idempotency.ts      # Transaction idempotency
│   │       │   └── error-handling.ts   # Standardized error responses
│   │       ├── types/
│   │       │   └── index.ts            # Shared types
│   │       └── shared.module.ts
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
│   ├── main.tsx                         # Entry point
│   ├── App.tsx                          # Root component
│   ├── index.css                        # Global styles
│   │
│   ├── features/                        # Feature-based organization
│   │   ├── auth/                        # Authentication & sign-up flows
│   │   │   ├── components/
│   │   │   │   ├── PhoneSignUp.tsx      # Phone OTP sign-up
│   │   │   │   ├── EmailSignUp.tsx      # Merchant email/password
│   │   │   │   ├── PhoneVerification.tsx # OTP verification
│   │   │   │   ├── PasswordReset.tsx    # Merchant password reset
│   │   │   │   └── SessionProvider.tsx  # Session context
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts           # Custom hook for session & auth methods
│   │   │   │   └── usePhone.ts          # Phone OTP hook
│   │   │   ├── pages/
│   │   │   │   ├── SignInPage.tsx
│   │   │   │   ├── SignUpPage.tsx
│   │   │   │   └── VerifyPage.tsx
│   │   │   ├── types/
│   │   │   ├── api/
│   │   │   │   └── authClient.ts        # Better Auth client methods
│   │   │   └── index.ts                 # Feature exports
│   │   │
│   │   ├── customer-dashboard/          # Customer-specific UI
│   │   │   ├── components/
│   │   │   │   ├── ProgramCard.tsx      # Display program info
│   │   │   │   ├── BalanceDisplay.tsx   # Stamps, points balance
│   │   │   │   ├── RewardsList.tsx      # Available rewards
│   │   │   │   ├── TransactionHistory.tsx
│   │   │   │   └── QRScanner.tsx        # Scan merchant QR
│   │   │   ├── pages/
│   │   │   │   ├── CustomerDashboard.tsx
│   │   │   │   ├── ProgramDetail.tsx
│   │   │   │   └── RedeemReward.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCustomerBalances.ts
│   │   │   │   └── useCustomerPrograms.ts
│   │   │   ├── api/
│   │   │   │   └── customerAPI.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── merchant-dashboard/          # Merchant-specific UI
│   │   │   ├── components/
│   │   │   │   ├── ProgramForm.tsx      # Create/edit program
│   │   │   │   ├── ProgramStats.tsx     # Program metrics
│   │   │   │   ├── CustomerList.tsx
│   │   │   │   ├── PurchaseForm.tsx     # Record purchase
│   │   │   │   └── RedemptionApproval.tsx
│   │   │   ├── pages/
│   │   │   │   ├── MerchantDashboard.tsx
│   │   │   │   ├── CreateProgram.tsx
│   │   │   │   └── ManageProgram.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMerchantPrograms.ts
│   │   │   │   └── useMerchantMetrics.ts
│   │   │   ├── api/
│   │   │   │   └── merchantAPI.ts
│   │   │   └── index.ts
│   │   │
│   │   └── admin/                       # Admin interface (simple Phase 1)
│   │       ├── components/
│   │       ├── pages/
│   │       ├── api/
│   │       └── index.ts
│   │
│   ├── shared/                          # Shared across features
│   │   ├── components/
│   │   │   ├── Layout.tsx               # Main layout wrapper
│   │   │   ├── Navigation.tsx           # Header/sidebar
│   │   │   ├── Button.tsx               # shadcn/ui Button (via Storybook if needed)
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx                # Notifications
│   │   │   └── Loading.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts                # Axios wrapper with error handling
│   │   │   ├── useQuery.ts              # React Query wrapper
│   │   │   └── useLocalStorage.ts
│   │   ├── api/
│   │   │   └── client.ts                # Axios instance, interceptors
│   │   ├── types/
│   │   │   ├── api.ts                   # Shared API types
│   │   │   ├── user.ts                  # User & session types
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── validation.ts            # Zod schemas
│   │   │   ├── formatting.ts            # Date, currency formatting
│   │   │   └── constants.ts             # App constants
│   │   ├── styles/
│   │   │   ├── tailwind.config.js       # Tailwind + shadcn/ui config
│   │   │   └── globals.css
│   │   └── index.ts
│   │
│   └── pages/                           # Route pages (if not using feature-based)
│       ├── LandingPage.tsx
│       ├── NotFound.tsx
│       └── index.ts
│
├── public/                              # Static assets
│   ├── images/
│   ├── icons/
│   └── manifest.json                    # PWA manifest
│
├── .env.example                         # Template environment variables
├── vite.config.ts                       # Vite configuration
├── tsconfig.json
├── package.json
└── index.html
```

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
