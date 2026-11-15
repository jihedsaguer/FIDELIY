# UX Vocabulary

This is the verified vocabulary of current frontend surfaces and contracts. It intentionally excludes ledger capabilities that have no public HTTP endpoint.

## Primary actions

| Action | Surface | Outcome |
|---|---|---|
| Send verification code | Customer login | Requests an OTP for an international phone number |
| Verify and continue | Customer login | Verifies the OTP, refreshes the Better Auth session, and opens `/customer` |
| Create merchant account | Merchant registration | Registers email/password credentials, refreshes the session, and opens merchant onboarding |
| Sign in | Merchant login | Authenticates email/password, refreshes the session, and opens merchant onboarding |
| Save and continue | Merchant onboarding steps 1–4 | Persists the current business or branch setup step, refetches the server state, and advances |
| Complete business setup | Merchant onboarding review | Requests backend completion after client-side completeness checks |

## Secondary actions

| Action | Surface | Outcome |
|---|---|---|
| Try again | Session, route, or setup error | Refetches the failed session or business setup query |
| Use a different phone number | OTP verification | Returns to the phone-number form and clears OTP feedback/state |
| Previous | Merchant onboarding | Moves to the preceding client-side step without persisting a new change |
| Sign out | Customer or merchant scaffold | Calls Better Auth sign-out and returns to the relevant login page |
| Open business setup | Merchant dashboard scaffold | Opens `/merchant/onboarding` |

## States

| State | Applies to | Verified treatment |
|---|---|---|
| Session loading | App and protected routes | `LoadingPanel` or inline status message |
| Authenticated | Protected routes | Required customer/merchant profile query must also succeed |
| Unauthenticated | Protected routes | Redirect to the capability-specific login route |
| Session/profile error | App and protected routes | Recovery panel or route error copy; retry where available |
| Forbidden capability | Protected routes | Access-restricted message and return-home link |
| OTP requested | Customer login | Code form replaces phone form |
| Mutation pending | Forms and sign-out | Relevant control disabled; waiting label shown |
| Setup required / in progress / complete | Merchant onboarding | Backend setup state restores the form step or redirects to merchant dashboard on completion |

No verified state exists for a displayed balance, earn/redeem operation, transaction history, reward eligibility, or customer QR screen.

## Surfaces

| Surface | Route | Current purpose |
|---|---|---|
| Home | `/` | Entry point and session-aware customer/merchant choice |
| Customer login | `/customer/login` | Phone OTP authentication |
| Customer dashboard scaffold | `/customer` | Authenticated customer identity/session confirmation only |
| Merchant login | `/merchant/login` | Merchant email/password authentication |
| Merchant registration | `/merchant/register` | Merchant owner registration |
| Merchant onboarding | `/merchant/onboarding` | Resumable five-step business setup |
| Merchant dashboard scaffold | `/merchant` | Authenticated merchant confirmation and onboarding link |

## Existing copy patterns

| Pattern | Evidence |
|---|---|
| Direct task label | “Send verification code”, “Save and continue”, “Complete business setup” |
| Recovery error | “We could not load your setup” followed by a retry action |
| Progress confirmation | “Saved. Your progress is stored securely and you can return any time.” |
| Session recovery | “Your session may have expired. Sign in again to continue; your saved setup will be restored.” |

Sources: `frontend/src/features/auth/pages/`, `frontend/src/features/business-onboarding/`, and `frontend/src/app/routes/RouteGuards.tsx`.
