---
paths:
  - "frontend/src/**"
---

# Frontend rules

Read `docs/DESIGN_SYSTEM.md` before creating or changing UI.

- **Ground, don't invent:** use real tokens (`styles/design-tokens.css` via `var(--token)`), existing `components/ui` primitives and the closest sibling page. If a token, pattern or label is missing, flag it as undefined and ask; do not make one up.
- **Localization:** every visible string comes from `useI18n()` in `shared/i18n/i18n.tsx`, added in both French and Arabic. Use logical Tailwind classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) so RTL works. Name the same action the same way everywhere.
- **States:** design default, loading, empty, error and success states with `LoadingPanel` and `FormFeedback`. Show no fake metrics or data the backend does not provide.
- **Destructive actions:** confirm with `components/ui/ConfirmDialog` (`variant="destructive"`, see `docs/DESIGN_SYSTEM.md` section 6); ask before adding deletion or correction UI that is not already approved.
- **Layout:** `AppLayout` already renders `<main id="main-content">`, so pages use `<div>`. Modals use `--z-modal` so they stack above the mobile bottom nav. Touch targets are at least 44px; focus uses `:focus-visible`.
- **Frontend-only work** changes no backend, API contract, route or business logic.
- **web-design-guidelines:** its Title Case, curly-quote and English typography rules and its Next.js hydration rules do not apply to this French/Arabic Vite app; apply the accessibility, focus, form, touch and layout rules.
- **Verify:** `npx tsc --noEmit` and `npx vitest run <file>` in `frontend/`. For layout changes, also check 390, 820 and 1280px widths in French and Arabic in a browser, and report only what you actually ran.
