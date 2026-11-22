# FIDELIY Design System

Verified against the frontend source on 2026-11-21. Ground UI work in this document and the code it cites; do not invent tokens, components, patterns or copy. If a value is missing, flag it as undefined and ask.

## 1. Product direction

- **Users:** merchant owner (operational UI: direct, compact, task-led) and customer (loyalty wallet: clear, premium). Smartphone-first, desktop secondary. Source: `docs/PRODUCT.md`.
- **Voice:** concise task labels, factual state messages, clear recovery guidance with a retry. No decorative dashboard copy, fake metrics, or claims about earning, balances, rewards or history that the backend does not support. Square POS / Shopify POS and Starbucks Rewards are interaction-quality references only, not templates.
- **Not in Release 1:** native apps, NFC, POS integration, payments, analytics (`docs/PRODUCT.md`).
- **Unresolved:** formal brand voice; supported browser/device matrix; offline behaviour; whether user research defines an action-count budget. Product targets (dashboard load < 1 s, transactions < 500 ms) are not verified frontend budgets.

## 2. Stack and where styles live

React 19, Vite, TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`, `frontend/tailwind.config.mjs`), Redux Toolkit with RTK Query (`services/api/baseApi.ts`, cookie credentials, `/api` proxy). shadcn/ui is not used (DECISIONS #17).

- `frontend/src/styles/design-tokens.css`: CSS custom properties (tokens). Authoritative values.
- `frontend/src/styles/globals.css`: imported by `main.tsx`. Base element defaults live in `@layer base` so Tailwind utilities can override them. It also contains legacy global classes (`.btn-*`, `.card`, `.form-stack`, `.sidebar-nav`, ...).
- `frontend/src/styles/global.css` (singular): not imported by any source file; stale.
- Components consume tokens as `var(--token)` inside Tailwind utilities. Merge classes with `cn` (`frontend/src/lib/utils.ts`).

## 3. Tokens (`design-tokens.css`)

| Role | Tokens |
|---|---|
| Brand | `--brand #f97316`, `--brand-dark #ea580c`, `--brand-light #fcd34d`, scale `--brand-50`..`--brand-900` |
| Surfaces | `--background #f7f8f6`, `--surface #fff`, `--surface-elevated`, `--subtle #f1f5f1` |
| Text | `--text #17231f`, `--text-muted #4a5250`, `--text-subtle #6b7280` |
| Borders | `--border #dfe7e1`, `--border-strong #cdd3cd`, `--divider` |
| Semantic | `--success #265f41`, `--warning #f59e0b`, `--danger #8e3f36`, `--info #0284c7`, each with `-light` and `-subtle` variants |
| Type | `--font-sans` Inter stack; `--text-xs`..`--text-6xl` (12px..60px); weights 300..900; leading tight 1.25 / normal 1.5 / relaxed 1.625 |
| Spacing | `--space-1`..`--space-40` on a 4px base (4, 8, 12, 16, 20, 24, 28, 32, ...) |
| Radius | `--radius-sm 6px`, `md 8px`, `lg 12px`, `xl 16px`, `2xl`, `3xl`, `full` |
| Shadow | `--shadow-sm`..`xl`, `--shadow-brand-sm`..`lg` |
| Layering | dropdown 100, sticky 200, fixed 300, modal-backdrop 400, modal 500, popover 600, tooltip 700, toast 1000 |
| Motion | `--transition-fast 150ms`, `normal 200ms`, `slow 300ms`; reduced motion is honoured in `globals.css` |

`design-tokens.css` also defines dark-theme values; whether the application applies them is not verified. Heading and body fonts are not imported by the stylesheet, so Inter renders only if installed on the device.

## 3a. Component primitives (`frontend/src/components/ui`)

Reuse these before creating anything new: `Button` (variants primary, secondary, accent, ghost, outline, destructive; sizes sm 36 / md 44 / lg 48 px min height; `isLoading`), `Badge` (default, primary, secondary, success, warning, danger, info, brand; optional dot), `Card` (+ `CardHeader`, `CardContent`, `CardFooter`; variants default, glass, bordered, elevated), `Input` and `InputField`, `SelectField`, `Section`, `FormFeedback`, `SubmitButton`, `LoadingPanel`, `InfoCard`, `BranchCard`, `Modal`, `ConfirmDialog`, `Accordion` + `AccordionItem`. The barrel `components/ui/index.ts` exports only a subset (including `Modal`, `ConfirmDialog`, `Accordion`); import the others by path.

- **Modal:** `--z-modal`; the panel has `role="dialog"` (or `alertdialog`), `aria-modal` and a unique `useId` title id; localized close button (`t('close')`, 44px, logical classes). Below `sm` it is a bottom sheet up to `100dvh` whose body scrolls internally. Body scroll is locked while any dialog is open; focus moves into the dialog (first focusable element or `initialFocusRef`), Tab is trapped and focus returns to the opener on close; only the top-most dialog reacts to Escape. The behaviour lives in `useDialogLayer.ts`.
- **ConfirmDialog:** built on `Modal` as an `alertdialog` (title, message, confirm label, default cancel label `t('cancel')`, `variant="destructive"`, `isPending`, optional `errorMessage`). The destructive variant focuses Cancel first; while pending, neither action nor Escape/overlay dismisses it.
- **Accordion:** `Accordion` (group; items are independent) and `AccordionItem` (`title`, `defaultOpen`, `headingLevel`): a native button inside a heading, with `aria-expanded`/`aria-controls`, toggles a labelled `region`; Enter/Space come from the native button.
- **QR rendering:** `features/customer/components/QRCodeDisplay.tsx` uses the bundled `qrcode.react` canvas (no CDN); the forwarded canvas ref allows PNG export. Layouts: `components/layout/{AppLayout,PublicLayout,Sidebar}.tsx`.

## 4. Layout and navigation (merchant workspace)

- Below 768px: bottom navigation (Home, Programmes, Scan which opens the scanner modal, More). The sidebar renders nothing.
- 768-1023px: sidebar fixed collapsed at 64px (`w-16`), content offset `md:ml-16`.
- 1024px and up: sidebar 256px (`w-64`), content offset `lg:ml-64`.
- The page is wrapped in `<main id="main-content">` by `AppLayout`; pages must not nest another `<main>`.
- Modals must stack above the bottom nav (`--z-modal`).
- Content width is capped near 1120px in the public and app shells.

Source: `AppLayout.tsx`, `Sidebar.tsx`, `docs/IMPLEMENTATION_STATUS.md`. Browser-verified on 2026-11-21 with mocked API at 390, 820 and 1280px; physical-device safe-area insets are not verified.

## 5. Localization and RTL

- Locales: `fr` (default) and `ar` (`Locale = 'fr' | 'ar'` in `shared/i18n/i18n.tsx`), persisted in browser storage; `document.documentElement.dir` is `rtl` for Arabic.
- All user-visible strings come from `useI18n()` message keys; add every new key in both languages. Money formatting uses `formatTnd` (locale `fr-TN` / `ar-TN`).
- Use logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) rather than left/right; check mirrored layouts in Arabic.

## 6. Interaction patterns (verified behaviour)

- **Forms:** validate on submit; inputs use native `required`, type and autocomplete attributes. Form-level errors and notices use `FormFeedback` (`role="alert"` for errors, `role="status"` for notices). Clear feedback when a field changes or before a new submit.
- **Pending actions:** disable the control and show a task-specific waiting label (`SubmitButton`, `Button isLoading`).
- **Loading and errors:** session and route restoration use `LoadingPanel`; failures state what failed and offer "Try again" (refetch) or sign-in recovery.
- **Destructive actions:** confirm with `ConfirmDialog` (`variant="destructive"`): the title asks the action as a question, the message states the consequence (e.g. the previous QR stops working; a reversal is final, `DECISIONS` #15), the confirm label repeats the action, Cancel is focused first, and on failure the dialog stays open with an error and a retryable confirm. Approved for personal-QR rotation (implemented), programme deactivation and reversal (later slices). Sign-out still executes directly.
- **Optimistic updates, polling, skeletons, toasts, offline handling:** none verified.
- **Focus and keyboard:** native controls and DOM tab order; `:focus-visible` shows an orange ring; `Button` uses a ring utility. A skip link exists on the customer dashboard only. Touch targets are at least 44px.
- **Accessibility target:** WCAG 2.2 AA (`docs/ROADMAP.md` records the contrast fix and a11y tests). `frontend/src/test-utils/a11y-audit.test.ts` documents manual checks; `@axe-core/playwright` is a dev dependency.

## 7. Vocabulary and copy

Copy is action-led and short. Use existing message keys and wording before adding new labels; when a new action, state or label is needed, add it to `i18n.tsx` in French and Arabic and keep the same name for the same action across surfaces. Recurring patterns: direct task label (verb + object), recovery error followed by a retry action, progress confirmation ("saved", "you can return any time"), session-recovery message. Surfaces follow `frontend/src/app/routes/paths.ts` (`/customer/*`, `/merchant/*`, `/qr/:qrId`). Customer sign-in is phone-only without OTP in Release 1 (`DECISIONS` #16), so do not write copy that promises a verification code.

## 8. Process for new UI

1. Clarify the job, the required system state, what happens on failure, and what success looks like.
2. List every state the screen needs (default, loading, empty, error, success, edge cases) using real data shapes and real tokens. For a substantial new screen, share a reviewable description or rendered mock before building; do not add a permanent Markdown file unless asked.
3. Confirm with the user, then spec, plan and implement, reusing `components/ui` and the closest sibling page.
4. Verify narrowly: `npx tsc --noEmit` and `npx vitest run <file>` in `frontend/`, then a browser check at mobile, tablet and desktop widths in French and Arabic when layout changed.

## 9. Known gaps

- Two styling mechanisms coexist: legacy global classes in `globals.css` and Tailwind utilities in components; prefer the components.
- `globals.css` contains an obsolete "shadcn/ui Layer Configuration" comment block and a 240px `.sidebar-nav` legacy layout that the merchant `AppLayout` does not use.
- `styles/global.css` is unused.
- Formal type scale, dark-mode behaviour and a destructive-action pattern are undecided.
