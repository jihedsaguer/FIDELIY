# Design Tokens

This is an inventory of values that exist today. The stylesheet has only colour custom properties; spacing, typography, radius, layering, and shadows are not formal token systems.

Source: `frontend/src/styles/global.css` and `frontend/src/features/business-onboarding/styles/business-onboarding.css`.

## Colour roles

| Existing token | Value | Current usage |
|---|---|---|
| `--color-brand` | `#2f7450` | Primary buttons and active onboarding states |
| `--color-brand-dark` | `#265f41` | Primary-button hover state |
| `--color-text` | `#17231f` | Root text colour |
| `--color-muted` | `#718078` | Root muted colour |
| `--color-border` | `#e4eae5` | Root border colour |

Other colours are hard-coded locally; they are not reusable tokens. There is no dark-mode token set.

## Typography

The root stack is `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Headings and selected strong text use `Manrope`; neither font is imported by the application stylesheet. Existing type sizes are component-local values, including `0.74rem` eyebrow text, `0.78rem` fine print, `0.85rem` small controls, `0.88rem` labels, `0.9rem` review values, `1rem` body emphasis, and `clamp()` heading sizes.

There is no named type scale. Any new type scale needs an explicit decision rather than a guessed token.

## Spacing, radius, layering, and shadows

There is no named spacing, radius, z-index, or shadow scale. Current component-local values include:

| Category | Observed values | Examples |
|---|---|---|
| Spacing | 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 22, 24, 26, 28, 30, 36, 42, 48, 56, 72px | Forms, panels, onboarding steps, page shell |
| Radius | 4, 6, 8, 9, 10, 11, 12, 16, 20px and `50%` | Logo previews, buttons, inputs, cards, panels, step indicator |
| Shadows | `0 8px 26px rgba(34, 57, 45, .035)`, `0 18px 56px rgba(33, 58, 44, .07)`, and smaller local shadows | Choice cards, panels, onboarding previews |
| Z-index | None defined | No shared overlay/layering contract exists |

## Audit notes

- `body` uses a decorative radial gradient and several components use large panel/card radii and transform hover effects. These conflict with the installed no-slop guardrail and should be assessed in the later visual refactor, not silently treated as a new system.
- `business-onboarding.css` is the closest existing mobile breakpoint pattern (`max-width: 600px`).
- The onboarding's merchant-defined `primaryColor` and `accentColor` are business data, not application design tokens.
- A formal semantic token system is unresolved and must be decided before new visual primitives are introduced.
