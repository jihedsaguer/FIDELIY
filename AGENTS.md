# Mandatory Rules for Coding Agents

This document defines the guardrails for all agents implementing features in the FIDELIY project. Follow these rules strictly.

## Core Principles

### Reuse-First
- **Check existing code before writing anything new.** Search the codebase for similar patterns, utilities, or implementations.
- Prefer composing existing modules and utilities over duplicating logic.
- If a utility doesn't exist but would be reused 2+ times, extract and document it.
- Exception: Do not force reuse for one-off, simple code (e.g., a single filter operation).

### Inspect Before Modifying
- Read the entire affected file and trace dependent code before editing.
- Identify all consumers of a modified function, module, or API.
- Document breaking changes explicitly in commit messages.
- Run affected tests before committing.

### Respect Release 1 Boundaries
- Features not explicitly listed in `docs/PRODUCT.md` (Release 1) are **out of scope**.
- Do not implement multi-manager, delegated access, NFC, advanced analytics, or any deferred features.
- If a task description requests out-of-scope work, ask for clarification instead of proceeding.
- Exception: Security fixes and critical bug fixes override scope boundaries.

### Follow Approved Architecture
- Implement only within the approved architecture defined in `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.
- **Backend (NestJS):** Use the modular structure; create features in `src/modules/`.
- **Frontend (React):** Organize by feature in `src/features/`; shared code in `src/shared/`.
- **Authentication:** Use Better Auth with:
  - Phone Number plugin for customer authentication (phone OTP)
  - Email/password for merchant authentication
  - Single Better Auth instance tied to `users` table (global identity)
  - Separate `customer_accounts` and `merchant_accounts` tables for capabilities
  - One person can have BOTH customer and merchant accounts
  - NestJS guards for role-based access control (CustomerGuard, MerchantGuard)
- **Database:** Use Postgres with Drizzle ORM; enforce multi-tenancy via PostgreSQL row-level security (RLS)
- Do not introduce new frameworks, runtimes, or architectural patterns without explicit approval.

### Never Invent Requirements
- Requirements come from `docs/PRODUCT.md` (Release 1 scope) or explicit user input.
- Do not assume user intent; ask instead.
- Do not add error handling, validation, or UI polish beyond what the task specifies.
- Do not implement "defensive" abstractions, configurability, or future-proofing.

### Report Evidence
- Include code references and file paths in commit messages and pull request descriptions.
- Link to `docs/DECISIONS.md` if a decision influenced the implementation.
- If a task reveals a conflict with existing code, document it in a comment or PR description.
- Highlight any assumptions or uncertainties.

### Avoid Unrelated Refactoring
- Do not clean up, rename, or reorganize code outside the scope of the task.
- Exception: If a change breaks a naming convention or pattern in the same file, apply the convention locally.
- Do not extract utilities or abstract patterns unless explicitly requested.

## Security and Quality Practices

### Testing
- Write tests for new features and bug fixes.
- Ensure tests run and pass before committing.
- For critical paths (auth, payments, data isolation), tests are mandatory.
- Test multi-tenant isolation: verify RLS policies prevent cross-tenant data access.
- Test account separation: verify CustomerGuard and MerchantGuard correctly enforce capabilities based on account table membership.

### Multi-Tenancy and Data Isolation
- All queries must respect tenant boundaries via Postgres row-level security (RLS).
- Do not filter users by ID alone; always scope queries to the authenticated merchant or customer's tenant.
- Verify RLS policies are applied and tested before committing.
- Test cross-tenant security: ensure a customer cannot access another customer's data or a merchant's data.

### Authentication and Authorization
- Use Better Auth for all user sessions and credentials.
- Customer authentication: Better Auth Phone Number plugin with external SMS provider (pending vendor selection for Tunisia +216).
- Merchant authentication: Better Auth email/password provider.
- Account capabilities: Enforce via NestJS guards (CustomerGuard, MerchantGuard) checking `customer_accounts` or `merchant_accounts` table membership, not frontend logic alone.
- One person can be both customer and merchant; capabilities determined by account table records.
- Do not implement custom password hashing, token generation, or session management.
- Session security: Validate session on every protected request via Better Auth `getSession()`.

### Secrets and Configuration
- Never commit `.env`, credentials, or API keys.
- Use environment variables for all external service credentials:
  - Better Auth secret
  - Database connection strings (Supabase dev, Neon production alternative)
  - Resend API key
  - SMS provider credentials (pending vendor selection)
- Document required environment variables in `.env.example`.

## Token Efficiency for AI Agents

- **Batch-read files:** When reading related files, read them in parallel rather than sequentially.
- **Search first, read second:** Use grep or file search to locate candidates, then read specific ranges.
- **Prioritize function signatures:** For large files, extract only function signatures and key implementation details unless the full file is needed.
- **Reference external docs:** Link to approved docs instead of repeating their content.
- **Reuse context:** Do not re-ask questions about decisions already documented in `docs/DECISIONS.md`.

## Process

1. **Understand the task:** Read the requirement and trace how it fits into the approved architecture.
2. **Search for existing patterns:** Query the codebase for similar implementations.
3. **Implement:** Write code following the module and file structure conventions.
4. **Test:** Run tests; verify no existing tests break; include multi-tenancy and role-based access tests.
5. **Commit:** Use clear, evidence-based commit messages referencing files and decisions.
6. **Review:** Ensure the implementation respects the boundaries and principles above.

## Release 1 Feature Scope

**IN SCOPE:**
- Customer authentication (phone OTP via Better Auth Phone Number plugin)
- Merchant authentication (email + password via Better Auth)
- Loyalty programs (stamps, points)
- Transactions (earning, redemption)
- QR code scanning
- Dashboards (customer, merchant, admin)
- Email notifications (Resend)

**OUT OF SCOPE (Deferred):**
- Multi-manager support
- Delegated permissions
- NFC scanning
- Advanced analytics
- Public API
- Mobile apps

Do not implement deferred features without explicit approval.
