# FIDELIY Frontend - Forensic Issue Register

**Video Evidence:** `FIDELIY - Loyalty Platform - Google Chrome 2026-11-18 13-54-49.mp4`
**Investigation Date:** 2026-11-18

---

## Legend
- ✅ = Fixed / Resolved
- ⚠️ = Backend limitation (cannot fix in frontend)
- 🔄 = Requires investigation
- ❌ = Not yet addressed

---

## Critical Issues

### 1. **Merchant Dashboard - Hardcoded Metrics** (Timestamp: ~00:00-00:10)
**Screen:** Merchant Dashboard
**Observed:** Displayed "248 customers" and "+12% growth" figures
**Root Cause:** Hardcoded values in `CustomerDashboardPage.tsx` (lines with "248" and "+12%")
**Backend Support:** NO - No customer-list endpoint exists (`GET /customers` not implemented)
**Correction:** 
- ✅ Removed hardcoded metrics
- ✅ Display honest state: "—" for unavailable customer count
- ✅ Added explanatory text that customer list is unavailable
**Status:** ✅ FIXED

### 2. **Customer QR - Not Available** (Timestamp: ~00:45-01:00)
**Screen:** Customer QR Page
**Observed:** "QR code not available" and "Failed to load QR code"
**Root Cause:** 
- `useGetPersonalQrQuery()` calls `GET /customers/personal-qr` which returns `{issuedAt, active}` WITHOUT `credential` string
- Only `POST /customers/personal-qr` returns `{credential, issuedAt}`
- Backend limitation: GET endpoint doesn't return the actual credential
**Backend Support:** PARTIAL - POST works, GET doesn't return credential
**Correction:**
- ✅ Updated `CustomerQRPage.tsx` to use `useIssuePersonalQrMutation` as fallback
- ✅ If GET fails or returns no credential, automatically POST to issue one
- ✅ Show loading state during credential issuance
**Status:** ✅ FIXED

### 3. **Customer Activity - Hardcoded Data** (Timestamp: ~01:15-01:30)
**Screen:** Customer Activity Page
**Observed:** Hardcoded activities: Café Tunis (5 stamps, 2024-01-15), Boulangerie (100 points, 2024-01-10), Restaurant (Free Coffee redemption, 2024-01-05)
**Root Cause:** Hardcoded array in `CustomerActivityPage.tsx`
**Backend Support:** NO - No endpoint for customer transaction history
- Frontend API client defines `GET /customers/memberships/{membershipId}/transactions` but backend doesn't implement it
- Backend service `CustomerBalanceService.getTransactionHistory()` exists but has no controller endpoint
**Correction:**
- ❌ Replace hardcoded data with empty state
- ❌ Display "Activity history not yet available" message
**Status:** ❌ PENDING

### 4. **Customer Identity Inconsistency** (Timestamp: ~00:30-01:45)
**Screen:** Customer Dashboard vs Customer Profile
**Observed:** 
- Dashboard shows: "Welcome, 23565529" (phone number as name)
- Profile shows: "Jean Dupont" with phone "+216 12 345 678"
**Root Cause:** 
- `CustomerDashboardPage.tsx` uses `session?.user.name` from Better Auth
- `CustomerProfilePage.tsx` has hardcoded "Jean Dupont" data
- Auth session contains real user data (name, email, phoneNumber)
**Backend Support:** YES - Auth session provides real data
**Correction:**
- ❌ Update `CustomerProfilePage.tsx` to use `useAuth().session?.user` data
- ❌ Remove hardcoded profile data
- ❌ Make fields editable only where backend supports it
**Status:** ❌ PENDING

### 5. **Customer Profile - Hardcoded Data** (Timestamp: ~01:30-01:45)
**Screen:** Customer Profile Page
**Observed:** Hardcoded: name="Jean Dupont", phone="+216 12 345 678", email="jean.dupont@email.com", birthdate="1990-05-15"
**Root Cause:** Local state initialization in `CustomerProfilePage.tsx`
**Backend Support:** PARTIAL - Auth provides name, email, phone; profile editing not fully implemented
**Correction:** Same as Issue #4
**Status:** ❌ PENDING (Combined with #4)

### 6. **Merchant Customers - List Not Available** (Timestamp: ~00:10-00:20)
**Screen:** Merchant Customers Page
**Observed:** Empty table with search/filter controls that imply functionality
**Root Cause:** 
- `MerchantCustomersPage.tsx` likely tries to call non-existent `GET /customers` endpoint
- Backend only has `GET /customers/...` for specific customer operations, not merchant customer listing
**Backend Support:** NO - No merchant customer list endpoint
**Correction:**
- ❌ Remove inactive search/filter controls
- ❌ Display clear message: "Customer list not yet available. Use QR scanner to identify customers."
- ❌ Make QR scanning the primary action
**Status:** ❌ PENDING

### 7. **Loyalty Programme Preview - Inconsistent** (Timestamp: ~02:00-02:30)
**Screen:** Merchant Programme Management
**Observed:** Programme preview doesn't match actual customer card design
**Root Cause:** Separate preview implementation from customer loyalty card
**Backend Support:** YES - Programme data available
**Correction:**
- ❌ Use same `LoyaltyCard` component for both merchant preview and customer display
- ❌ Ensure preview updates from form state
- ❌ Remove fake customer balances from preview
**Status:** ❌ PENDING

### 8. **Release 1 Auth Limitations** (Timestamp: throughout)
**Observed:** Phone number used as identity without verification
**Root Cause:** Release 1 defers OTP verification to Release 2
**Backend Support:** BY DESIGN - Phone ownership NOT verified in Release 1
**Correction:**
- ⚠️ DO NOT claim phone number verifies identity
- ⚠️ Keep flow simple: phone as identifier, no verification claim
- ⚠️ Update UI text to not imply verification
**Status:** ⚠️ BACKEND LIMITATION - Document only

---

## Backend Limitations Identified

| Feature | Backend Status | Frontend Action |
|---------|---------------|-----------------|
| Customer list for merchant | ❌ Not implemented | Show unavailable state |
| Customer transaction history | ❌ Endpoint not exposed | Show unavailable state |
| Customer profile (GET /customers/profile) | ❌ Not implemented | Use auth session data |
| Programme transaction/activity listing | ❌ Not implemented | Show available data only |
| Personal QR credential (GET) | ⚠️ Returns no credential | Use POST to issue |
| Rewards table | ⚠️ May not exist | Handle gracefully |

---

## Implementation Order

1. ✅ Issue #1: Merchant dashboard hardcoded metrics
2. ✅ Issue #2: Customer QR credential retrieval
3. ❌ Issue #4 & #5: Customer identity and profile (use auth session)
4. ❌ Issue #3: Customer activity hardcoded data
5. ❌ Issue #6: Merchant customers page
6. ❌ Issue #7: Programme preview consistency

---

## Files Requiring Changes

### Already Fixed:
- `frontend/src/features/merchant/pages/MerchantDashboardPage.tsx` - Removed hardcoded metrics
- `frontend/src/features/customer/pages/CustomerQRPage.tsx` - Use POST for credential
- `frontend/src/styles/global.css` - Removed old scanner CSS

### Pending:
- `frontend/src/features/customer/pages/CustomerActivityPage.tsx` - Remove hardcoded data
- `frontend/src/features/customer/pages/CustomerProfilePage.tsx` - Use auth session
- `frontend/src/features/merchant/pages/MerchantCustomersPage.tsx` - Update for unavailable list
- `frontend/src/features/merchant/pages/...` - Programme preview fixes
