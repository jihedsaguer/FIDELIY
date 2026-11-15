# Interaction System

This records current verified behavior. It does not prescribe behavior that the application does not implement.

## Forms and validation

- Forms validate on submit. Customer OTP validation normalizes and validates the international phone number before the request; onboarding validates the active step before saving. Source: `CustomerLoginPage.tsx`, `BusinessOnboardingPage.tsx`.
- Inputs use native `required`, type, length, and autocomplete attributes where applicable. Onboarding forms set `noValidate` and use their explicit validation messages. Source: `frontend/src/features/**/pages` and `components/OnboardingStepForm.tsx`.
- Form-level errors and notices render with `FormFeedback`; errors use `role="alert"`, notices use `role="status"`. Source: `frontend/src/components/ui/FormFeedback.tsx`.
- Submit actions disable while their request is pending and replace the action label with a task-specific waiting label. Source: `frontend/src/components/ui/SubmitButton.tsx`.
- Server errors are rendered through the same form-feedback component. Onboarding clears form feedback when a field changes; auth clears it before a new submit attempt. Source: `BusinessOnboardingPage.tsx`, auth page components.

## Loading and async

- Route/session restoration uses `LoadingPanel` with a status message. Source: `frontend/src/app/routes/index.tsx`, `RouteGuards.tsx`.
- Business setup blocks its form while a mutation is pending, refetches setup after save, restores fields from the server response, and resumes at the appropriate step. Source: `BusinessOnboardingPage.tsx`.
- There are no verified optimistic updates, polling, streaming, offline handling, skeleton components, or toast notifications.

## Destructive and consequential actions

The current frontend has no record deletion or loyalty transaction action. Sign-out is the only consequential session action and currently executes directly without a confirmation. Future earning and redemption interactions require their own confirmed backend contracts and an explicit interaction decision; they must not be inferred from the internal ledger.

## Empty and error states

- Current auth and business-setup failures state that the operation failed and offer “Try again” or sign-in recovery where appropriate. Source: `RouteGuards.tsx`, `BusinessOnboardingPage.tsx`.
- The current dashboard scaffolds do not retrieve programme, membership, ledger, balance, reward, or history data, so no corresponding empty states exist yet. Source: `CustomerDashboardPage.tsx`, `MerchantDashboardPage.tsx`, `docs/CHECKPOINT_6BC_ASSESSMENT.md`.

## Focus and keyboard

- Forms follow DOM tab order and use native controls. No explicit `tabindex`, keyboard-shortcut policy, modal focus trap, or skip-to-content link exists.
- Text inputs receive a custom border and box-shadow focus state from `global.css`. Other controls rely on browser defaults unless styled locally.
- The accessibility conformance target is unresolved.
