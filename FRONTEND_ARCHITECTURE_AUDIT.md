# FIDELIY Frontend Architecture Audit

## Executive Summary

The FIDELIY frontend has a **good foundation** with feature-based organization, centralized design tokens, and existing reusable components. However, it suffers from **large monolithic page components**, **inconsistent styling systems**, and **missing shadcn/ui integration**. The architecture needs modernization to be truly scalable and maintainable.

**Current State**: Feature-based structure with custom UI components  
**Target State**: Feature-based structure with shadcn/ui + extracted feature components  
**Effort Level**: HIGH (Requires systematic refactoring)

---

## Part 1: Current Architecture Assessment

### 1.1 Folder Structure Analysis

#### ✅ Strengths
- **Feature-based organization**: `features/auth/`, `features/merchant/`, `features/customer/`, `features/loyalty/`, `features/business-onboarding/`
- **API separation**: Each feature has its own `api/` folder with RTK Query hooks
- **Shared utilities**: `lib/utils.ts` for shared functions, `shared/i18n/` for translations
- **Layout components**: `components/layout/` for AppLayout, Sidebar, PublicLayout
- **UI components**: `components/ui/` for reusable primitives

#### ❌ Issues
- **No `components.json`**: shadcn/ui is not installed
- **Duplicate CSS files**: Both `globals.css` and `global.css` exist with overlapping styles
- **Inconsistent styling**: Mix of custom CSS classes (`.btn`, `.input`) and Tailwind token classes (`token-bg-primary`)

### 1.2 Component Analysis

#### Custom UI Components (Existing)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Button | `components/ui/Button.tsx` | ✅ Good | Typed, variants, sizes, loading state |
| Card | `components/ui/Card.tsx` | ✅ Good | With Header/Content/Footer sub-components |
| Badge | `components/ui/Badge.tsx` | ✅ Good | With variants and sizes |
| Input | `components/ui/Input.tsx` | ✅ Good | Typed, variants |
| Modal | `components/ui/Modal.tsx` | ✅ Good | Basic modal structure |
| FormFeedback | `components/ui/FormFeedback.tsx` | ✅ Good | Error/success messages |
| LoadingPanel | `components/ui/LoadingPanel.tsx` | ⚠️ Simple | Just a skeleton |
| Section | `components/ui/Section.tsx` | ✅ Good | Layout container |
| SubmitButton | `components/ui/SubmitButton.tsx` | ⚠️ Simple | Wrapper for Button |
| InfoCard | `components/ui/InfoCard.tsx` | ⚠️ Legacy | Uses old styling |
| InputField | `components/ui/InputField.tsx` | ⚠️ Legacy | Uses old styling |
| SelectField | `components/ui/SelectField.tsx` | ⚠️ Legacy | Uses old styling |
| BranchCard | `components/ui/BranchCard.tsx` | ⚠️ Legacy | Feature-specific in wrong location |

#### Layout Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| AppLayout | `components/layout/AppLayout.tsx` | ✅ Good | Merchant/Customer layouts, ScannerProvider |
| PublicLayout | `components/layout/PublicLayout.tsx` | ✅ Good | Public pages layout |
| Sidebar | `components/layout/Sidebar.tsx` | ✅ Good | Merchant navigation with scanner integration |

### 1.3 Page Component Analysis

#### 📄 Merchant Pages

| Page | File | Lines | Responsibilities | Issues |
|------|------|-------|-----------------|--------|
| MerchantDashboardPage | `features/merchant/pages/MerchantDashboardPage.tsx` | ~359 | Stats cards, quick actions, business info, branches, programmes, setup status | ❌ Too large, multiple responsibilities |
| MerchantProgramsPage | `features/merchant/pages/MerchantProgramsPage.tsx` | ~894 | Programme listing, creation form, history, preview | ❌ **Massive**, combines listing+creation+preview |
| MerchantBranchesPage | `features/merchant/pages/MerchantBranchesPage.tsx` | ~? | Branch listing and management | ⚠️ Needs review |
| MerchantCustomersPage | `features/merchant/pages/MerchantCustomersPage.tsx` | ~? | Customer listing and scanning | ⚠️ Needs review |
| MerchantSettingsPage | `features/merchant/pages/MerchantSettingsPage.tsx` | ~? | Settings | ⚠️ Needs review |

#### 📄 Customer Pages

| Page | File | Lines | Responsibilities | Issues |
|------|------|-------|-----------------|--------|
| CustomerDashboardPage | `features/customer/pages/CustomerDashboardPage.tsx` | ~283 | Loyalty cards, QR code | ⚠️ Could extract LoyaltyCard component |
| CustomerQRPage | `features/customer/pages/CustomerQRPage.tsx` | ~175 | QR display and generation | ✅ Focused |
| CustomerActivityPage | `features/customer/pages/CustomerActivityPage.tsx` | ~95 | Activity list | ✅ Focused |
| CustomerProfilePage | `features/customer/pages/CustomerProfilePage.tsx` | ~134 | Profile display and edit | ⚠️ Could extract ProfileForm |

#### 📄 Loyalty Pages

| Page | File | Lines | Responsibilities | Issues |
|------|------|-------|-----------------|--------|
| ScannerModal | `features/loyalty/components/ScannerModal.tsx` | ~900 | Scanner UI, camera, customer resolution, transactions | ❌ **Massive**, multiple responsibilities |
| PublicQrLandingPage | `features/loyalty/pages/PublicQrLandingPage.tsx` | ~? | Public business page | ⚠️ Needs review |

#### 📄 Auth Pages

| Page | File | Lines | Responsibilities | Issues |
|------|------|-------|-----------------|--------|
| HomePage | `features/auth/pages/HomePage.tsx` | ~? | Landing page | ⚠️ Needs review |
| CustomerLoginPage | `features/auth/pages/CustomerLoginPage.tsx` | ~? | Customer auth | ⚠️ Needs review |
| MerchantAuthPage | `features/auth/pages/MerchantAuthPage.tsx` | ~? | Merchant auth | ⚠️ Needs review |

### 1.4 Feature Component Analysis

#### Loyalty Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| LoyaltyCardPreview | `features/merchant/components/LoyaltyCardPreview.tsx` | ✅ Good | Programme preview for merchants |
| ScannerModal | `features/loyalty/components/ScannerModal.tsx` | ❌ Too large | Needs decomposition |
| ScannerContext | `features/loyalty/context/ScannerContext.tsx` | ✅ Good | Scanner state management |

**Missing Feature Components:**
- LoyaltyCard (customer-facing)
- CustomerScanResult
- ManualCredentialEntry
- ScannerViewport
- ScannerErrorState
- ScannerInstructions
- StampGrid
- PointsProgress
- RewardList

### 1.5 Styling System Analysis

#### Design Tokens
- ✅ Comprehensive token system in `design-tokens.css`
- ✅ Light and dark mode support
- ✅ Color, typography, spacing, radius, shadow, z-index tokens
- ✅ Glassmorphism tokens
- ✅ Brand orange color scale

#### CSS Architecture
- ❌ **Two global CSS files**: `globals.css` and `global.css` with overlapping styles
- ❌ **Mixed systems**: Custom CSS classes + Tailwind token classes
- ❌ **No shadcn/ui**: Custom components instead of standardized primitives
- ✅ **Tailwind v4**: Using `@tailwindcss/vite` plugin
- ⚠️ **Token classes**: Using `token-bg-primary`, `token-fg-brand`, etc.

#### Token Class Usage
The newer components (from Phase 1) use token-based classes:
```tsx
className="bg-token-bg-primary text-token-fg-brand border-token-border-subtle"
```

These map to CSS variables defined in `design-tokens.css`:
- `--background: #f7f8f6` → `bg-token-bg-primary`
- `--brand: #f97316` → `token-fg-brand` (text color)
- `--border: #dfe7e1` → `token-border-subtle`

### 1.6 API & State Management

#### RTK Query
- ✅ Used for all API calls
- ✅ Feature-based API slices
- ✅ Auto-generated hooks (useGetXQuery, useXMutation)
- ✅ Consistent pattern across features

#### State Management
- ✅ Redux Toolkit for store
- ✅ RTK Query for server state
- ✅ Local state (useState) for UI state
- ✅ Context API for cross-component state (ScannerContext)
- ⚠️ No centralized UI state management (toasts, modals, etc.)

#### API Files
- `features/auth/api/authApi.ts`
- `features/business-onboarding/api/businessOnboardingApi.ts`
- `features/loyalty/api/customerApi.ts`, `merchantTransactionApi.ts`, `publicApi.ts`
- `features/merchant/api/branchApi.ts`, `merchantApi.ts`, `programApi.ts`
- `services/api/baseApi.ts` (RTK Query base configuration)

### 1.7 Internationalization (i18n)

#### Translation System
- ✅ Centralized in `shared/i18n/i18n.tsx`
- ✅ French and Arabic support
- ✅ `useI18n()` hook available
- ✅ RTL support with `[dir="rtl"]` selectors

#### Issues
- ❌ **Incomplete coverage**: Many pages use hardcoded English/French strings
- ❌ **MerchantProgramsPage**: No translations at all (all hardcoded English)
- ❌ **Some hardcoded strings**: "Sign out", "Scan", etc. in Sidebar (partially fixed)

### 1.8 Routing

#### Route Structure
```tsx
// app/routes/index.tsx
- / (Home) → CustomerLoginPage or MerchantAuthPage
- /merchant/* → MerchantLayout
  - /merchant → MerchantDashboardPage
  - /merchant/customers → MerchantCustomersPage
  - /merchant/programs → MerchantProgramsPage
  - /merchant/branches → MerchantBranchesPage
  - /merchant/settings → MerchantSettingsPage
- /customer/* → CustomerLayout  
  - /customer → CustomerDashboardPage
  - /customer/qr → CustomerQRPage
  - /customer/activity → CustomerActivityPage
  - /customer/profile → CustomerProfilePage
- /public/:credential → PublicQrLandingPage (public business page)
- /onboarding/* → BusinessOnboardingRoute
```

#### Route Guards
- ✅ CustomerGuard for customer routes
- ✅ MerchantGuard for merchant routes
- ✅ Public routes without guards

---

## Part 2: Target Architecture Proposal

### 2.1 Folder Structure (Target)

```
frontend/src/
├── app/
│   ├── providers.tsx          # All context providers
│   ├── routes/
│   │   ├── index.tsx          # Route definitions
│   │   ├── paths.ts           # Route path constants
│   │   └── RouteGuards.tsx    # Route guard components
│   └── store.ts              # Redux store
│
├── components/
│   ├── layout/                # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── PublicLayout.tsx
│   │   └── Sidebar.tsx
│   │
│   └── ui/                   # Shared UI primitives (shadcn/ui)
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Input.tsx
│       ├── Dialog.tsx
│       ├── Sheet.tsx
│       ├── Drawer.tsx
│       ├── Alert.tsx
│       ├── Toast.tsx
│       ├── Skeleton.tsx
│       ├── Tooltip.tsx
│       ├── Separator.tsx
│       ├── Form/
│       │   ├── Form.tsx
│       │   ├── FormField.tsx
│       │   ├── FormItem.tsx
│       │   └── ...
│       ├── index.ts
│       └── components.json    # shadcn/ui configuration
│
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   │
│   ├── business-onboarding/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   │
│   ├── customer/
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── LoyaltyCard.tsx
│   │   │   │   ├── LoyaltyCardList.tsx
│   │   │   │   ├── StampGrid.tsx
│   │   │   │   ├── PointsProgress.tsx
│   │   │   │   └── RewardList.tsx
│   │   │   └── pages/
│   │   │       └── CustomerDashboardPage.tsx
│   │   │
│   │   ├── qr/
│   │   │   ├── components/
│   │   │   │   └── CustomerQRCode.tsx
│   │   │   └── pages/
│   │   │       └── CustomerQRPage.tsx
│   │   │
│   │   ├── activity/
│   │   │   ├── components/
│   │   │   │   ├── ActivityList.tsx
│   │   │   │   ├── ActivityItem.tsx
│   │   │   │   └── ActivityEmptyState.tsx
│   │   │   └── pages/
│   │   │       └── CustomerActivityPage.tsx
│   │   │
│   │   └── profile/
│   │       ├── components/
│   │       │   ├── ProfileHeader.tsx
│   │       │   ├── ProfileForm.tsx
│   │       │   └── ProfileEditDialog.tsx
│   │       └── pages/
│   │           └── CustomerProfilePage.tsx
│   │
│   ├── merchant/
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   ├── DashboardStats.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   ├── BusinessOverview.tsx
│   │   │   │   ├── BranchOverview.tsx
│   │   │   │   ├── ProgramOverview.tsx
│   │   │   │   └── SetupStatus.tsx
│   │   │   └── pages/
│   │   │       └── MerchantDashboardPage.tsx
│   │   │
│   │   ├── programs/
│   │   │   ├── components/
│   │   │   │   ├── ProgramList.tsx
│   │   │   │   ├── ProgramCard.tsx
│   │   │   │   ├── ProgramCreateDialog.tsx
│   │   │   │   ├── ProgramEditDialog.tsx
│   │   │   │   ├── ProgramDeleteDialog.tsx
│   │   │   │   ├── ProgramPreview.tsx
│   │   │   │   ├── ProgramHistory.tsx
│   │   │   │   └── ProgramForm/
│   │   │   │       ├── ProgramForm.tsx
│   │   │   │       ├── ProgramTypeSelector.tsx
│   │   │   │       ├── StampRulesForm.tsx
│   │   │   │       ├── PointsRulesForm.tsx
│   │   │   │       └── RewardConfiguration.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProgramForm.ts
│   │   │   └── pages/
│   │   │       └── MerchantProgramsPage.tsx
│   │   │
│   │   ├── customers/
│   │   │   ├── components/
│   │   │   │   ├── CustomerList.tsx
│   │   │   │   ├── CustomerCard.tsx
│   │   │   │   └── CustomerEmptyState.tsx
│   │   │   └── pages/
│   │   │       └── MerchantCustomersPage.tsx
│   │   │
│   │   ├── branches/
│   │   │   ├── components/
│   │   │   │   ├── BranchList.tsx
│   │   │   │   ├── BranchCard.tsx
│   │   │   │   ├── BranchForm.tsx
│   │   │   │   ├── CreateBranchDialog.tsx
│   │   │   │   ├── EditBranchDialog.tsx
│   │   │   │   └── DeleteBranchDialog.tsx
│   │   │   └── pages/
│   │   │       └── MerchantBranchesPage.tsx
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       │   └── SettingsNavigation.tsx
│   │       └── pages/
│   │           └── MerchantSettingsPage.tsx
│   │
│   └── loyalty/
│       ├── scanner/
│       │   ├── components/
│       │   │   ├── ScannerDialog.tsx
│       │   │   ├── ScannerViewport.tsx
│       │   │   ├── ScannerInstructions.tsx
│       │   │   ├── ManualCredentialEntry.tsx
│       │   │   ├── CustomerScanResult.tsx
│       │   │   ├── ScannerPermissionState.tsx
│       │   │   ├── ScannerErrorState.tsx
│       │   │   └── ScannerLoadingState.tsx
│       │   ├── context/
│       │   │   └── ScannerContext.tsx
│       │   ├── hooks/
│       │   │   ├── useScanner.ts
│       │   │   └── useCustomerResolution.ts
│       │   └── pages/
│       │       └── (Scanner is modal, not page)
│       │
│       ├── cards/
│       │   └── components/
│       │       ├── LoyaltyCard.tsx
│       │       ├── LoyaltyCardHeader.tsx
│       │       ├── StampGrid.tsx
│       │       ├── PointsProgress.tsx
│       │       └── RewardList.tsx
│       │
│       └── pages/
│           └── PublicQrLandingPage.tsx
│
├── hooks/                      # Global reusable hooks
│   └── useMediaQuery.ts
│
├── lib/
│   ├── utils.ts               # Shared utility functions
│   └── constants.ts            # Application constants
│
├── services/
│   └── api/
│       ├── baseApi.ts         # RTK Query base configuration
│       └── baseApi.test.ts
│
├── shared/
│   ├── i18n/
│   │   ├── i18n.tsx           # Translation dictionaries
│   │   └── LanguageSwitcher.tsx
│   │
│   └── types/                 # Global TypeScript types
│
├── styles/
│   ├── globals.css            # Global styles + Tailwind import
│   └── design-tokens.css      # Design token definitions
│
├── main.tsx
└── vite-env.d.ts
```

### 2.2 Component Responsibility Map

#### Pages Layer (Route-level Composition)

| Page | Current Responsibilities | Target Responsibilities | Components to Extract |
|------|-------------------------|------------------------|----------------------|
| MerchantDashboardPage | Stats, quick actions, business info, branches, programmes, setup status | Page-level data coordination | DashboardHeader, DashboardStats (StatCard x4), QuickActions, BusinessOverview, BranchOverview, ProgramOverview, SetupStatus |
| MerchantProgramsPage | Programme listing, creation form, history, preview | Page-level data coordination | ProgramList, ProgramCreateDialog, ProgramHistory, LoyaltyCardPreview |
| MerchantBranchesPage | Branch listing and management | Page-level data coordination | BranchList, CreateBranchDialog, EditBranchDialog, DeleteBranchDialog |
| MerchantCustomersPage | Customer listing and scanning | Page-level data coordination | CustomerList, CustomerEmptyState |
| MerchantSettingsPage | Settings | Page-level data coordination | SettingsNavigation |
| CustomerDashboardPage | Loyalty cards, QR code | Page-level data coordination | LoyaltyCardList, CustomerQRCode |
| CustomerQRPage | QR display and generation | Page-level data coordination | CustomerQRCode |
| CustomerActivityPage | Activity list | Page-level data coordination | ActivityList |
| CustomerProfilePage | Profile display and edit | Page-level data coordination | ProfileHeader, ProfileForm, ProfileEditDialog |
| PublicQrLandingPage | Public business page | Page-level data coordination | PublicBusinessCard, ProgramInfo, BranchInfo, QRJoinForm |

#### Feature Components Layer

**Merchant Dashboard Components:**
- `DashboardHeader`: Page header with title and actions
- `DashboardStats`: Container for all stat cards
- `StatCard`: Individual stat card (customers, programmes, branches, setup)
- `QuickActions`: Grid of quick action buttons
- `BusinessOverview`: Business information display
- `BranchOverview`: Branch summary
- `ProgramOverview`: Programme summary
- `SetupStatus`: Setup completion status

**Programme Management Components:**
- `ProgramList`: List of programmes
- `ProgramCard`: Individual programme card
- `ProgramCreateDialog`: Dialog for creating a new programme
- `ProgramEditDialog`: Dialog for editing a programme
- `ProgramDeleteDialog`: Confirmation dialog for deletion
- `ProgramPreview`: Visual preview of the programme (customer view)
- `ProgramHistory`: List of previous programme versions
- `ProgramForm`: Main form component
- `ProgramTypeSelector`: Radio group for programme type
- `StampRulesForm`: Stamp-specific configuration
- `PointsRulesForm`: Points-specific configuration
- `RewardConfiguration`: Reward setup

**Customer Loyalty Components:**
- `LoyaltyCard`: Customer-facing loyalty card
- `LoyaltyCardList`: Grid/list of loyalty cards
- `LoyaltyCardHeader`: Business info in card
- `StampGrid`: Visual stamp progress
- `PointsProgress`: Points progress bar
- `RewardList`: List of available rewards
- `RewardItem`: Individual reward

**Scanner Components:**
- `ScannerDialog`: Main modal container
- `ScannerViewport`: Camera preview area
- `ScannerInstructions`: User instructions
- `ManualCredentialEntry`: Form for manual credential input
- `CustomerScanResult`: Display resolved customer info
- `ScannerPermissionState`: Camera permission handling
- `ScannerErrorState`: Error display
- `ScannerLoadingState`: Loading indicator

#### Shared UI Components (shadcn/ui)

**Primitives:**
- `Button`: Primary, secondary, accent, ghost, outline, destructive variants
- `Card`: Default, glass, bordered, elevated variants
- `Badge`: Multiple variants and sizes
- `Input`: Text, password, number inputs
- `Textarea`: Multi-line text input
- `Select`: Dropdown select
- `Checkbox`: Boolean toggle
- `RadioGroup`: Radio button group
- `Switch`: Toggle switch
- `Tabs`: Tab navigation
- `Dialog`: Modal dialog
- `Sheet`: Side panel
- `Drawer`: Bottom drawer (mobile)
- `Alert`: Inline alert messages
- `Toast`: Notification toasts
- `Skeleton`: Loading placeholders
- `Tooltip`: Hover tooltips
- `Separator`: Visual dividers
- `Progress`: Progress bars
- `Form`: Form wrapper with validation

**Layout:**
- `Container`: Responsive container
- `Section`: Content section with header
- `Grid`: Responsive grid
- `Flex`: Flex container
- `Stack`: Vertical/horizontal stack

**Feedback:**
- `EmptyState`: Empty state with icon and message
- `LoadingState`: Loading indicator
- `ErrorState`: Error display

### 2.3 Shadcn/ui Integration Plan

#### Phase A: Install shadcn/ui
1. Run `npx shadcn@latest init` to create `components.json`
2. Configure to use Tailwind v4
3. Set up design token mapping
4. Add to `globals.css`

#### Phase B: Add Missing Components
Based on shadcn/ui and Shadcn Space catalogue:

**From shadcn/ui core:**
- [ ] Dialog
- [ ] Alert Dialog
- [ ] Sheet
- [ ] Toast
- [ ] Tabs
- [ ] Select
- [ ] Checkbox
- [ ] Radio Group
- [ ] Switch
- [ ] Form
- [ ] Label
- [ ] Skeleton
- [ ] Tooltip
- [ ] Separator
- [ ] Progress
- [ ] Table
- [ ] Dropdown Menu

**From Shadcn Space (selected patterns):**
- [ ] Stat Card (for dashboard metrics)
- [ ] Feature Card (for dashboard features)
- [ ] Sidebar Navigation
- [ ] Form Layouts
- [ ] Modal Dialogs
- [ ] Empty States
- [ ] Loading States

### 2.4 Migration Strategy

#### Stage 1: Setup shadcn/ui Foundation (Week 1)
1. Install and configure shadcn/ui
2. Map design tokens to Tailwind theme
3. Add core shadcn components (Button, Card, Badge, Input, Dialog, etc.)
4. Verify existing styles still work

#### Stage 2: Create Shared UI System (Week 1-2)
1. Migrate existing Button, Card, Badge, Input to shadcn patterns
2. Add missing shadcn components
3. Create component documentation
4. Test all components

#### Stage 3: Extract Feature Components (Week 2-4)
1. **Dashboard**: Extract stat cards, quick actions, overview sections
2. **Programmes**: Extract programme cards, forms, dialogs, preview
3. **Scanner**: Extract scanner UI components
4. **Customer**: Extract loyalty cards, QR, activity, profile
5. **Branches**: Extract branch cards, forms, dialogs

#### Stage 4: Page Refactoring (Week 4-5)
1. Refactor pages to use extracted feature components
2. Move logic from pages to feature components
3. Ensure all pages are < 200 lines
4. Verify TypeScript types

#### Stage 5: Visual Consistency (Week 5-6)
1. Apply design tokens consistently
2. Standardize spacing and typography
3. Implement glassmorphism where appropriate
4. Verify RTL support

#### Stage 6: Testing & Validation (Week 6)
1. Run TypeScript compilation
2. Run existing tests
3. Production build
4. Browser testing
5. Screenshot comparison

---

## Part 3: Specific Component Responsibility Details

### 3.1 Current: MerchantDashboardPage (~359 lines)

**Current Responsibilities:**
- Page layout and structure
- Loading states
- Error handling
- Business setup data fetching
- Current programme data fetching
- Branches data fetching
- Stats card rendering (4 cards)
- Business details rendering
- Branches list rendering
- Programme info rendering
- Setup status rendering
- Quick actions section
- Features section

**Target: MerchantDashboardPage (< 100 lines)**

**Page Responsibilities (Target):**
```tsx
// MerchantDashboardPage.tsx
import { useGetBusinessSetupQuery, useGetCurrentProgramQuery, useListBranchesQuery } from '../api'
import { DashboardHeader } from '../components/DashboardHeader'
import { DashboardStats } from '../components/DashboardStats'
import { QuickActions } from '../components/QuickActions'
import { BusinessOverview } from '../components/BusinessOverview'
import { BranchOverview } from '../components/BranchOverview'
import { ProgramOverview } from '../components/ProgramOverview'
import { SetupStatus } from '../components/SetupStatus'

export default function MerchantDashboardPage() {
  // Fetch data
  const setupQuery = useGetBusinessSetupQuery()
  const programQuery = useGetCurrentProgramQuery()
  const branchesQuery = useListBranchesQuery()
  
  // Pass data to components
  return (
    <main>
      <DashboardHeader />
      <DashboardStats 
        setup={setupQuery.data} 
        program={programQuery.data} 
        branches={branchesQuery.data?.branches} 
        isLoading={isLoading}
      />
      <QuickActions />
      <BusinessOverview business={setupQuery.data?.business} />
      <BranchOverview branches={branchesQuery.data?.branches} />
      <ProgramOverview program={programQuery.data} />
      <SetupStatus status={setupQuery.data?.status} />
    </main>
  )
}
```

**Extracted Components:**

1. **DashboardHeader** - Page header with branding
2. **DashboardStats** - Container for all stat cards
3. **StatCard** - Individual stat card component
4. **QuickActions** - Grid of quick action buttons
5. **BusinessOverview** - Business information display
6. **BranchOverview** - Branch summary with cards
7. **ProgramOverview** - Programme summary
8. **SetupStatus** - Setup completion status banner

### 3.2 Current: MerchantProgramsPage (~894 lines)

**This is the most critical refactoring target.**

**Current Responsibilities:**
- Programme listing
- Programme card rendering
- Programme history
- Programme creation form (INLINE - ~400 lines)
- Form state management
- Form validation
- Programme deletion
- Programme preview
- Loading states
- Error states
- Empty states

**Target: MerchantProgramsPage (< 150 lines)**

```tsx
// MerchantProgramsPage.tsx
import { useGetCurrentProgramQuery, useGetProgramHistoryQuery, useCreateEnhancedProgramMutation, useDeactivateProgramMutation } from '../api'
import { ProgramList } from '../components/ProgramList'
import { ProgramCreateDialog } from '../components/ProgramCreateDialog'
import { ProgramHistory } from '../components/ProgramHistory'

export default function MerchantProgramsPage() {
  const currentProgramQuery = useGetCurrentProgramQuery()
  const historyQuery = useGetProgramHistoryQuery()
  const [createProgram] = useCreateEnhancedProgramMutation()
  const [deactivateProgram] = useDeactivateProgramMutation()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  return (
    <>
      <PageHeader title="Programmes" />
      
      <ProgramList 
        currentProgram={currentProgramQuery.data}
        isLoading={currentProgramQuery.isLoading}
        onDeactivate={deactivateProgram}
      />
      
      <ProgramHistory 
        programs={historyQuery.data ?? []}
        isLoading={historyQuery.isLoading}
      />
      
      <ProgramCreateDialog 
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={createProgram}
      />
      
      {!currentProgramQuery.data && (
        <EmptyState
          title="No programme yet"
          description="Create your first loyalty programme to start rewarding customers"
          action="Create Programme"
          onAction={() => setShowCreateForm(true)}
        />
      )}
    </>
  )
}
```

**Extracted Components:**

1. **ProgramList** - Container for programme cards
2. **ProgramCard** - Individual programme card
3. **ProgramCreateDialog** - Modal dialog for programme creation
4. **ProgramForm** - Form component (used by create and edit dialogs)
5. **ProgramTypeSelector** - Programme type radio group
6. **StampRulesForm** - Stamp-specific configuration
7. **PointsRulesForm** - Points-specific configuration
8. **RewardConfiguration** - Reward setup
9. **ProgramPreview** - Visual preview
10. **ProgramHistory** - List of previous programme versions
11. **ProgramDeleteDialog** - Confirmation dialog

### 3.3 Current: ScannerModal (~900 lines)

**Current Responsibilities:**
- Modal UI
- Camera initialization
- Camera permission handling
- QR scanning
- Manual credential entry
- Customer resolution
- Earnings calculation
- Transaction creation
- Reward redemption
- State management for all above

**Target: ScannerModal (< 200 lines) + Extracted Components**

```tsx
// ScannerModal.tsx
import { ScannerViewport } from './ScannerViewport'
import { ScannerInstructions } from './ScannerInstructions'
import { ManualCredentialEntry } from './ManualCredentialEntry'
import { CustomerScanResult } from './CustomerScanResult'
import { ScannerPermissionState } from './ScannerPermissionState'
import { ScannerErrorState } from './ScannerErrorState'

export function ScannerModal({ isOpen, onClose, branchId }: ScannerModalProps) {
  const [state, setState] = useState<ScanState>(initialState)
  
  const renderContent = () => {
    switch (state.step) {
      case 'scan':
        return (
          <>
            <ScannerViewport ref={videoRef} />
            <ScannerInstructions />
            <ManualCredentialEntry 
              value={manualCredential}
              onChange={setManualCredential}
              onSubmit={handleManualSubmit}
            />
          </>
        )
      case 'permission':
        return <ScannerPermissionState onRetry={requestCamera} />
      case 'resolved':
        return <CustomerScanResult 
          customer={state.customerData}
          onNext={handleNext}
          onScanAnother={resetScanner}
        />
      // ... other states
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {renderContent()}
    </Modal>
  )
}
```

**Extracted Components:**
1. **ScannerViewport** - Camera preview with scanning frame
2. **ScannerInstructions** - User guidance text
3. **ManualCredentialEntry** - Input field and submit button
4. **CustomerScanResult** - Display resolved customer with actions
5. **ScannerPermissionState** - Permission denied/error UI
6. **ScannerErrorState** - General error UI
7. **ScannerLoadingState** - Loading indicator
8. **useScanner** hook - Camera lifecycle and scanning logic

---

## Part 4: Implementation Roadmap

### Week 1: Foundation Setup

#### Day 1: Install shadcn/ui
- [ ] Run `npx shadcn@latest init`
- [ ] Configure for Tailwind v4
- [ ] Set up `components.json`
- [ ] Map design tokens to Tailwind theme
- [ ] Verify build still works

#### Day 2-3: Add Core shadcn Components
- [ ] Button (replace existing)
- [ ] Card (replace existing)
- [ ] Badge (replace existing)
- [ ] Input (replace existing)
- [ ] Label
- [ ] Select
- [ ] Checkbox
- [ ] Radio Group
- [ ] Switch
- [ ] Dialog
- [ ] Sheet
- [ ] Toast
- [ ] Skeleton
- [ ] Tooltip
- [ ] Separator
- [ ] Form

#### Day 4-5: Create Design System Documentation
- [ ] Document color tokens
- [ ] Document typography
- [ ] Document spacing
- [ ] Document component variants
- [ ] Create usage examples

### Week 2: Extract Dashboard Components

#### Day 1-2: Decompose MerchantDashboardPage
- [ ] Create `DashboardHeader`
- [ ] Create `DashboardStats`
- [ ] Create `StatCard`
- [ ] Create `QuickActions`
- [ ] Create `BusinessOverview`
- [ ] Create `BranchOverview`
- [ ] Create `ProgramOverview`
- [ ] Create `SetupStatus`

#### Day 3-4: Migrate Dashboard to shadcn
- [ ] Replace custom Card with shadcn Card
- [ ] Replace custom Button with shadcn Button
- [ ] Replace custom Badge with shadcn Badge
- [ ] Update styling to use tokens
- [ ] Verify RTL support

#### Day 5: Test Dashboard
- [ ] Verify TypeScript
- [ ] Verify build
- [ ] Manual browser test
- [ ] Capture screenshots

### Week 3: Extract Programme Components

#### Day 1-3: Decompose MerchantProgramsPage
- [ ] Create `ProgramList`
- [ ] Create `ProgramCard`
- [ ] Create `ProgramCreateDialog`
- [ ] Create `ProgramForm`
- [ ] Create `ProgramTypeSelector`
- [ ] Create `StampRulesForm`
- [ ] Create `PointsRulesForm`
- [ ] Create `RewardConfiguration`
- [ ] Create `ProgramPreview`
- [ ] Create `ProgramHistory`
- [ ] Create `ProgramDeleteDialog`

#### Day 4: Migrate Programmes to shadcn
- [ ] Replace all UI primitives
- [ ] Update form styling
- [ ] Update dialog styling
- [ ] Verify preview works

#### Day 5: Test Programmes
- [ ] Verify TypeScript
- [ ] Verify build
- [ ] Manual browser test
- [ ] Capture screenshots

### Week 4: Extract Scanner and Loyalty Components

#### Day 1-2: Decompose ScannerModal
- [ ] Create `ScannerViewport`
- [ ] Create `ScannerInstructions`
- [ ] Create `ManualCredentialEntry`
- [ ] Create `CustomerScanResult`
- [ ] Create `ScannerPermissionState`
- [ ] Create `ScannerErrorState`
- [ ] Create `ScannerLoadingState`
- [ ] Extract `useScanner` hook

#### Day 3: Extract Loyalty Card Components
- [ ] Create `LoyaltyCard`
- [ ] Create `LoyaltyCardList`
- [ ] Create `LoyaltyCardHeader`
- [ ] Create `StampGrid`
- [ ] Create `PointsProgress`
- [ ] Create `RewardList`
- [ ] Create `RewardItem`

#### Day 4-5: Migrate to shadcn
- [ ] Update scanner UI
- [ ] Update loyalty card UI
- [ ] Verify scanning works
- [ ] Test with real QR codes

### Week 5: Extract Remaining Components

#### Day 1: Customer Components
- [ ] Extract from CustomerDashboardPage
- [ ] Extract from CustomerQRPage
- [ ] Extract from CustomerActivityPage
- [ ] Extract from CustomerProfilePage

#### Day 2: Branch Components
- [ ] Extract from MerchantBranchesPage
- [ ] Create BranchList
- [ ] Create BranchCard
- [ ] Create BranchForm
- [ ] Create dialogs

#### Day 3: Auth Components
- [ ] Review auth pages
- [ ] Extract reusable components
- [ ] Migrate to shadcn

#### Day 4: Public Components
- [ ] Extract from PublicQrLandingPage
- [ ] Create PublicBusinessCard
- [ ] Create QRJoinForm

#### Day 5: Final Migration
- [ ] Update all imports
- [ ] Clean up old components
- [ ] Remove duplicate CSS

### Week 6: Testing and Validation

#### Day 1-2: Code Quality
- [ ] Run TypeScript compilation
- [ ] Fix all type errors
- [ ] Run ESLint
- [ ] Fix linting issues

#### Day 3: Build and Bundle
- [ ] Run production build
- [ ] Check bundle sizes
- [ ] Verify no errors

#### Day 4: Browser Testing
- [ ] Test all pages
- [ ] Test all interactions
- [ ] Verify scanner works
- [ ] Test QR generation and scanning
- [ ] Capture screenshots

#### Day 5: RTL and Responsive
- [ ] Test French (LTR)
- [ ] Test Arabic (RTL)
- [ ] Test mobile (390px)
- [ ] Test tablet (768px)
- [ ] Test desktop (1024px+)

---

## Part 5: Risk Assessment and Mitigation

### Risks

1. **Build Breakage**
   - *Risk*: Installing shadcn/ui might conflict with existing Tailwind v4
   - *Mitigation*: Test shadcn/ui with Tailwind v4 first, check compatibility

2. **Style Regression**
   - *Risk*: Migrating to shadcn/ui might break existing styles
   - *Mitigation*: Keep existing CSS files, migrate gradually, test each change

3. **Functionality Breakage**
   - *Risk*: Extracting components might break data flow
   - *Mitigation*: Preserve existing props and state management, test thoroughly

4. **Time Overrun**
   - *Risk*: This is a large refactoring that might take longer than estimated
   - *Mitigation*: Work in small, testable increments, prioritize critical paths

5. **Merge Conflicts**
   - *Risk*: Other changes might conflict with this refactoring
   - *Mitigation*: Work on a feature branch, keep changes atomic

### Success Criteria

✅ All TypeScript checks pass  
✅ Production build succeeds  
✅ Docker container builds successfully  
✅ All existing functionality works  
✅ No fabricated data in UI  
✅ Scanner works end-to-end  
✅ QR generation and scanning works  
✅ French and Arabic RTL work  
✅ Mobile and desktop responsive  
✅ Page components < 200 lines each  
✅ Feature components are reusable  
✅ shadcn/ui components are properly configured  

---

## Part 6: Shadcn Space References

### Dashboard
- **Stat Cards**: Use pattern from "Statistics Cards" block
- **Quick Actions**: Use pattern from "Action Cards" block
- **Layout**: Use pattern from "Dashboard Layout" block

### Forms
- **Programme Form**: Use pattern from "Multi-step Form" block
- **Branch Form**: Use pattern from "Simple Form" block
- **Form Fields**: Use shadcn/ui Form component

### Dialogs
- **Create Programme**: Use shadcn/ui Dialog with form
- **Delete Confirmation**: Use shadcn/ui AlertDialog
- **Scanner**: Use custom modal with shadcn/ui primitives

### Cards
- **Programme Card**: Use pattern from "Feature Card" block
- **Loyalty Card**: Use pattern from "Reward Card" block
- **Branch Card**: Use pattern from "Location Card" block

### Empty States
- **No Programmes**: Use pattern from "Empty State" block
- **No Customers**: Use pattern from "Empty State" block
- **No Activity**: Use pattern from "Empty State" block

---

## Next Steps

This audit is complete. The next step is to **implement the migration** starting with:

1. **Install shadcn/ui** and configure it for Tailwind v4
2. **Add core shadcn components** (Button, Card, Badge, Input, Dialog, etc.)
3. **Start with the Dashboard** as it's the most visible page

Would you like me to proceed with the implementation?
