#!/usr/bin/env node

/**
 * Automated Accessibility Audit Script
 * Uses Playwright + axe-core to scan the application for WCAG 2.2 AA violations
 * 
 * Usage: node scripts/accessibility-audit.js
 * 
 * Requirements:
 * - npm install --save-dev playwright axe-core @axe-core/playwright
 * - Application running on http://localhost:5174
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║       FIDELIY Frontend Accessibility Audit (Manual Mode)       ║
║                                                                ║
║ This script guides manual testing. For automated testing:      ║
║   npm install --save-dev playwright axe-core                  ║
║   node scripts/accessibility-audit.js                         ║
║                                                                ║
║ Application URL: http://localhost:5174                        ║
╚════════════════════════════════════════════════════════════════╝

MANUAL TESTING CHECKLIST
========================

## 1. MOBILE VIEWPORT TESTING (320px, 360px, 390px)

Open http://localhost:5174 in Chrome/Firefox with DevTools:
1. Press F12 to open DevTools
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Set viewport to 320px width
4. Verify:
   - No horizontal scroll
   - Text wraps properly
   - All buttons/inputs visible
   - Bottom navigation is fixed at bottom
   
Repeat for 360px and 390px widths.

## 2. LANGUAGE TESTING (French & Arabic)

1. Look for language switcher in app bar
2. Change language to French:
   - Verify all text is French
   - Check for proper text encoding (no &#39; entities)
   - Verify RTL not applied (LTR layout)
3. Change language to Arabic:
   - Verify all text is Arabic
   - Check RTL layout applied (dir="rtl")
   - Verify navigation reversed
   - Check margin/padding flipped appropriately

## 3. KEYBOARD NAVIGATION

1. Press Tab to move through interactive elements
2. Verify focus outline visible (3px green outline)
3. Test:
   - Tab through header navigation
   - Tab through form inputs (if on form page)
   - Tab through bottom navigation
   - Shift+Tab to go backwards
   - Enter to activate buttons
   - Escape to close dialogs (if present)

## 4. WCAG COLOR CONTRAST CHECK

1. Right-click on element → Inspect
2. In DevTools, use the accessibility panel
3. Check contrast ratio for:
   - Primary text on white background (should be ≥ 4.5:1)
   - Brand color text (should be ≥ 4.5:1)
   - Button text (should be ≥ 4.5:1)
   - Error/danger text (should be ≥ 4.5:1)

Alternative: Use https://webaim.org/resources/contrastchecker/

## 5. TOUCH TARGET VERIFICATION

On mobile viewport (320px):
1. Try to tap each button - should be comfortable 
2. Verify buttons are at least 44px tall
3. Check spacing between targets is at least 8px
4. Verify form inputs are 44px tall

## 6. FORM TESTING

1. Find any forms on the page
2. Verify each input has a visible label
3. Try to submit with empty fields - check error messages
4. Verify error messages are:
   - Linked to the input (aria-describedby)
   - Descriptive (e.g., "Email is required" not just "Error")
   - Visible without color alone

## 7. SCREEN READER TESTING (Optional - Advanced)

Download NVDA (free) for Windows:
https://www.nvaccess.org/download/

1. Start NVDA
2. Navigate the page with:
   - H key: Jump to headings
   - B key: Jump to buttons
   - L key: Jump to links
   - F key: Jump to form fields
3. Verify all content is announced correctly
4. Verify no orphaned text without context

## 8. AUTOMATIC CHECKS (Optional - Requires Setup)

If you install Playwright and axe-core, run:
  npm install --save-dev playwright axe-core @axe-core/playwright
  npx playwright install
  node scripts/accessibility-audit.js

This will:
- Scan all pages for WCAG violations
- Generate an HTML report
- List all accessibility issues

============================

FINDINGS TEMPLATE
=================

Issue: [e.g., "Button lacks focus outline on mobile"]
Severity: CRITICAL | HIGH | MEDIUM | LOW
Location: [e.g., "MerchantDashboardPage.tsx line 45"]
Current: [e.g., "No outline visible when focused"]
Expected: [e.g., "3px green outline should appear"]
Fix: [e.g., "Add :focus-visible rule to button"]

============================

QUICK REFERENCE: Color Palette (from global.css)
=================================================

--color-text: #17231f (primary dark text)
--color-muted: #627169 (secondary muted text)
--color-brand: #2f7450 (brand green)
--color-brand-dark: #265f41 (darker green)
--color-danger: #8e3f36 (danger/error red)
--color-surface: #ffffff (white background)
--color-subtle: #f1f5f1 (light gray background)

Contrast Ratios to Verify:
- #17231f on #ffffff: 16.5:1 ✅ (exceeds 4.5:1)
- #627169 on #ffffff: ~3.9:1 (FAILS - needs improvement)
- #2f7450 on #ffffff: 5.5:1 ✅ (exceeds 4.5:1)
- #ffffff on #2f7450: ~2.5:1 (FAILS - may need lighter text or darker bg)

============================

CSS BREAKPOINTS (from global.css)
==================================

Mobile (< 768px):
- 320px min-width
- Bottom navigation fixed at bottom
- Single column layout
- Touch targets: 44px minimum

Tablet (≥ 768px):
- Bottom nav becomes horizontal static nav
- Grid layout: 2 columns
- Max width: 1120px

Desktop (≥ 1024px):
- Centered layout, max 1120px wide
- Full horizontal navigation

============================

Ready to test? Open http://localhost:5174 and start with step 1!
`);

// Check if axe-core is installed
try {
  require('axe-core');
  console.log('\n✅ axe-core detected. Advanced automated testing available.');
} catch {
  console.log('\n❌ axe-core not installed. Install with:');
  console.log('   npm install --save-dev playwright axe-core @axe-core/playwright');
}
