# Design Brief

## Product definition

**What it is:** FIDELIY is a web-based loyalty platform for Tunisian SMBs and their customers, supporting merchant-managed stamp and points programmes. Source: `docs/PRODUCT.md`.

**What it is not:** A native mobile app, public API, NFC solution, POS integration, payment product, multi-manager tool, delegated-permission product, or advanced analytics product in Release 1. Source: `docs/PRODUCT.md`.

**Core value proposition:** Customers use one account across participating businesses while merchants configure and operate their own loyalty programmes. Source: `README.md`, `docs/PRODUCT.md`.

**Primary jobs:**

- When a customer visits a participating business, help them identify themselves and track that business's loyalty membership so they can earn and redeem rewards.
- When a merchant operates a business, help them set up their business, branches, and programmes so they can run loyalty interactions efficiently.

Source: `docs/PRODUCT.md`.

## Users and platform

| User | Verified context | Verified jobs |
|---|---|---|
| Merchant owner | Operational merchant experience; smartphone-first, desktop secondary. | Set up a business, branch, branding and programme; manage customers; initiate purchase/reward workflows when backend support exists. |
| Customer | Loyalty-wallet experience; smartphone-first, desktop secondary. | Authenticate by phone OTP, join programmes, access their own membership and QR credential when the corresponding UI/API contract is available. |

Mobile-first is an established product direction from the modernization request. Square POS / Shopify POS and Starbucks Rewards are references for interaction quality only, not templates or feature requirements.

**Unresolved:** No user research records define a user's largest current friction or an acceptable action count. Product performance targets are a customer dashboard load under one second and transaction processing under 500 ms (`docs/PRODUCT.md`); these are not yet verified frontend budgets.

## Product character and copy

The documented direction is direct, compact, operational merchant UI and a clear, premium loyalty-wallet customer UI. Existing shipped copy is plain and action-led (for example, “Send verification code”, “Save and continue”, and “Complete business setup”). Source: `frontend/src/features/**/pages`, `frontend/src/features/business-onboarding/components/OnboardingStepForm.tsx`.

Use concise task labels, clear recovery guidance, and factual state messages. Do not use decorative dashboard copy, fake metrics, or claims about earning, balances, rewards, or history until supported by public backend contracts.

**Unresolved:** The brand's formal voice, localization policy (including Arabic/French), and currency/date formatting policy have not been defined in source documentation.

## Constraints

- React, TypeScript, Vite, Redux Toolkit, and RTK Query are the current frontend stack. `frontend/package.json`.
- Auth is Better Auth cookie/session based; protected access is confirmed by backend capability checks. `AGENTS.md`, `frontend/src/services/api/baseApi.ts`, `frontend/src/app/routes/RouteGuards.tsx`.
- Existing business setup is a five-step, resumable merchant flow. `frontend/src/features/business-onboarding/`.
- Do not modify backend contracts, auth, database schemas, migrations, RLS, or business rules as part of frontend modernization. User direction and `AGENTS.md`.
- Loyalty ledger internals exist, but there are no public earning, redemption, balance, or history HTTP endpoints. `docs/CHECKPOINT_6BC_ASSESSMENT.md`.
- Small phones are primary; larger phones, tablets, and desktop are secondary. User direction.

**Unresolved:** Accessibility conformance level, supported browser/device matrix, and offline behavior are not documented.
