# FIDELIY Design System

## Overview

This document outlines the design system for FIDELIY, inspired by Apple's design principles and Figma's component organization. It provides guidelines for creating consistent, accessible, and maintainable UI components.

## Design Principles

### 1. Clarity
- **Purpose**: Every element should have a clear purpose and function
- **Simplicity**: Remove unnecessary complexity; favor straightforward solutions
- **Legibility**: Text should be readable at all sizes and distances

### 2. Consistency
- **Visual**: Use the same styles, colors, and spacing throughout
- **Behavioral**: Components should behave predictably
- **Terminal**: Follow platform conventions (web, iOS, Android)

### 3. Accessibility
- **Inclusive**: Design for all users, including those with disabilities
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Color Contrast**: Maintain WCAG 2.1 AA contrast ratios (4.5:1 for normal text)

### 4. Feedback
- **Visual**: Provide clear visual feedback for user actions
- **Tactile**: Ensure touch targets are appropriately sized
- **Responsive**: Interfaces should respond to user input without delay

## Color Palette

### Primary Colors
- **Orange (Primary Brand)**: `#F85804` - Used for primary actions, accents, and highlights
- **Orange Light**: `#ff7a22` - Hover states
- **Orange Dark**: `#e04a00` - Active states

### Secondary Colors
- **Green (Secondary Brand)**: `#2f7450` - Used for success states and secondary actions
- **Green Light**: `#5da77c`
- **Green Dark**: `#265f41`

### Neutral Colors
- **Background**: `#F0E8E0` - Warm beige/off-white primary background
- **Surface**: `#FFFFFF` - Card and elevated surface backgrounds
- **Charcoal**: `#101010` - Primary text color
- **Text Secondary**: `#4a4a4a`
- **Text Muted**: `#6b7280`

### Semantic Colors
- **Success**: `#10b981` - Positive actions and states
- **Warning**: `#f59e0b` - Cautionary states
- **Danger**: `#ef4444` - Errors and destructive actions
- **Info**: `#3b82f6` - Informational messages

## Typography

### Font Family
- **Primary**: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Sizes
| Size | Value | Use Case |
|------|-------|----------|
| xs | 0.75rem (12px) | Captions, labels |
| sm | 0.875rem (14px) | Secondary text, table cells |
| base | 1rem (16px) | Body text |
| lg | 1.125rem (18px) | Subheadings |
| xl | 1.25rem (20px) | Headings |
| 2xl | 1.5rem (24px) | Page titles |
| 3xl | 1.875rem (30px) | Section titles |
| 4xl | 2.25rem (36px) | Hero titles |

### Font Weights
| Weight | Value | Use Case |
|--------|-------|----------|
| Normal | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Buttons, labels |
| Bold | 700 | Headings |
| Black | 800 | Important headings |

### Line Heights
| Name | Value | Use Case |
|------|-------|----------|
| Tight | 1.25 | Headings |
| Normal | 1.5 | Body text |
| Relaxed | 1.625 | Long-form content |

## Spacing

We use a consistent spacing scale based on powers of 2 (4px base unit):

| Size | Value | Use Case |
|------|-------|----------|
| 1 | 0.25rem (4px) | Tiny spacing |
| 2 | 0.5rem (8px) | Small spacing |
| 3 | 0.75rem (12px) | Medium-small spacing |
| 4 | 1rem (16px) | Standard spacing |
| 5 | 1.25rem (20px) | Large spacing |
| 6 | 1.5rem (24px) | Extra-large spacing |
| 8 | 2rem (32px) | Section spacing |
| 10 | 2.5rem (40px) | Large section spacing |
| 12 | 3rem (48px) | Extra-large section spacing |
| 16 | 4rem (64px) | Page section spacing |

## Border Radius

| Size | Value | Use Case |
|------|-------|----------|
| none | 0 | No rounding |
| sm | 0.375rem (6px) | Small cards, buttons |
| md | 0.5rem (8px) | Standard cards, inputs |
| lg | 0.75rem (12px) | Large cards, modals |
| xl | 1rem (16px) | Extra-large cards |
| full | 9999px | Pills, avatars |

## Shadows

| Size | Value | Use Case |
|------|-------|----------|
| none | 0 | No shadow |
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle depth |
| md | 0 4px 6px -1px rgba(0,0,0,0.1) | Cards |
| lg | 0 10px 15px -3px rgba(0,0,0,0.1) | Modals |
| primary-sm | 0 2px 8px rgba(248,88,4,0.08) | Orange-tinted shadow |
| primary-md | 0 4px 12px rgba(248,88,4,0.15) | Orange-tinted shadow |

## Component Organization

### Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── layout/          # Layout components (Sidebar, AppLayout)
│   ├── shared/
│   │   ├── ui/             # Reusable UI components (Button, Card, Input)
│   │   └── hooks/          # Custom React hooks
│   └── features/
│       └── merchant/       # Feature-specific components
│           ├── dashboard/
│           │   └── components/  # Dashboard-specific components
│           └── programs/
│               └── components/  # Program-specific components
└── docs/
    └── DESIGN_SYSTEM.md    # This document
```

### Naming Conventions
- **PascalCase**: All component files and folder names
- **Descriptive**: Names should clearly describe the component's purpose
- **Prefix**: Use feature prefix for feature-specific components (e.g., `MerchantDashboardCard`)

## Component Library (shadcn/ui)

We use [shadcn/ui](https://ui.shadcn.com/) as our component library. This provides:

1. **Pre-built, accessible components** that follow best practices
2. **Copy-paste components** that you own and can customize
3. **Tailwind CSS** integration for utility-first styling
4. **TypeScript** support out of the box

### Available Components

#### Layout
- `Card` - Container for content
- `Button` - Interactive buttons
- `Input` - Form inputs
- `Label` - Form labels
- `Badge` - Status indicators

#### Adding New Components
To add a new shadcn component:

1. Visit [ui.shadcn.com](https://ui.shadcn.com/docs/components)
2. Find the component you need
3. Copy the component code
4. Save it in `src/components/ui/`
5. Export it from `src/components/ui/index.ts`

## Layout System

### Sidebar
- **Width**: 240px (expanded), 64px (collapsed)
- **Background**: White
- **Border**: 1px solid #e5e7eb (border color)
- **Z-index**: 300 (above most content)

### Main Content
- **Margin-left**: Matches sidebar width
- **Max-width**: 1120px
- **Padding**: 1.5rem (24px)

### Responsive Breakpoints
- **Mobile**: < 480px - Sidebar hidden, bottom navigation visible
- **Tablet**: < 768px - Sidebar condensed
- **Desktop**: >= 768px - Full sidebar

## Design Patterns

### 1. Cards
Cards are used to group related content and actions.

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    Actions
  </CardFooter>
</Card>
```

### 2. Forms
Forms should be structured with proper labels and validation.

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" placeholder="Enter your name" />
  </div>
  <Button type="submit">Submit</Button>
</div>
```

### 3. Lists
Lists should use consistent spacing and alignment.

```tsx
import { Card } from '@/components/ui/card'

<div className="space-y-4">
  {items.map((item) => (
    <Card key={item.id}>
      <div className="p-4">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>
    </Card>
  ))}
</div>
```

### 4. Status Badges
Use badges to indicate status consistently.

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Inactive</Badge>
<Badge variant="outline">Draft</Badge>
```

## Accessibility Guidelines

### 1. Focus Management
- All interactive elements must be focusable
- Use `focus-visible` for focus styles
- Maintain logical tab order

### 2. ARIA Labels
- Use `aria-label` for icon-only buttons
- Use `aria-expanded` for collapsible elements
- Use `aria-live` for dynamic content updates

### 3. Color Contrast
- Normal text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### 4. Touch Targets
- Minimum 44x44px for touch targets
- Provide adequate spacing between interactive elements

## Best Practices

### 1. Component Composition
- **Favor composition over inheritance**: Build components that can be composed
- **Single Responsibility**: Each component should do one thing well
- **Reusability**: Design components to be reusable in different contexts

### 2. Props
- **Explicit over implicit**: Make component behavior predictable
- **Default values**: Provide sensible defaults
- **Type safety**: Use TypeScript for all component props

### 3. Styling
- **Utility-first**: Use Tailwind's utility classes when possible
- **Custom CSS**: Only when utility classes are insufficient
- **Consistent naming**: Use consistent class naming conventions

### 4. Performance
- **Lazy loading**: Use `React.lazy` for large components
- **Memoization**: Use `React.memo` for pure components
- **Code splitting**: Split large bundles for better performance

### 5. Testing
- **Component tests**: Test component rendering and behavior
- **Accessibility tests**: Use axe-core for accessibility testing
- **Visual regression**: Consider visual regression testing for critical components

## Examples from Industry Leaders

### Apple Design Principles
1. **Deference**: The UI should defer to the content
2. **Clarity**: Text should be legible at every size
3. **Consistency**: Use consistent terminology and appearance

### Figma Component Organization
1. **Atomic Design**: Break UI into atoms, molecules, organisms
2. **Variants**: Create component variants for different states
3. **Auto Layout**: Use auto layout for consistent spacing
4. **Constraints**: Use constraints for responsive behavior

### Stripe Design System
1. **Element System**: Consistent primitives
2. **Component System**: Reusable components
3. **Pattern Library**: Common UI patterns
4. **Brand Guidelines**: Visual identity

## Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Figma Design Systems](https://www.figma.com/community/training/design-systems)
- [Stripe Design System](https://stripe.com/atlas/guides/design-systems)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Contributing

When contributing to the design system:

1. **Follow existing patterns**: Look for similar components and follow their structure
2. **Document decisions**: Add comments explaining non-obvious decisions
3. **Request review**: Get design and code review for new components
4. **Test thoroughly**: Ensure components work in all contexts and are accessible
5. **Update documentation**: Keep this document up to date

## Version History

- **v1.0.0** (2024-11-17): Initial design system documentation
