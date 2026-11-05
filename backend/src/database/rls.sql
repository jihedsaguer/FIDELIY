-- FIDELIY Database RLS Policies
-- Phase 1A: Milestone 1 - Row-Level Security Implementation
--
-- Enable RLS on all user-accessed tables
-- Apply policies to enforce tenant isolation via transaction-scoped app.user_id context

-- ============================================================================
-- ENABLE RLS ON TABLES
-- ============================================================================

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Note: RLS NOT enabled on auth tables (users, accounts, sessions, verifications)
-- Better Auth manages session scope; application must enforce authentication

-- ============================================================================
-- CUSTOMER_ACCOUNTS - Customer can view only their own record
-- ============================================================================

-- SELECT policy: Customer views only their own account
CREATE POLICY customer_accounts_select_own
  ON customer_accounts
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::uuid);

-- INSERT policy: Customer can create only their own account (enforced by app)
CREATE POLICY customer_accounts_insert_own
  ON customer_accounts
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- UPDATE policy: Customer can update only their own account
CREATE POLICY customer_accounts_update_own
  ON customer_accounts
  FOR UPDATE
  USING (user_id = current_setting('app.user_id')::uuid);

-- DELETE policy: Disable (account deletion via user cascade only)
-- No DELETE policy = DELETE denied by default

-- ============================================================================
-- MERCHANT_ACCOUNTS - Merchant can view only their own record
-- ============================================================================

-- SELECT policy: Merchant views only their own account
CREATE POLICY merchant_accounts_select_own
  ON merchant_accounts
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::uuid);

-- INSERT policy: Merchant can create only their own account (enforced by app)
CREATE POLICY merchant_accounts_insert_own
  ON merchant_accounts
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id')::uuid);

-- UPDATE policy: Merchant can update only their own account
CREATE POLICY merchant_accounts_update_own
  ON merchant_accounts
  FOR UPDATE
  USING (user_id = current_setting('app.user_id')::uuid);

-- DELETE policy: Disable (account deletion via user cascade only)
-- No DELETE policy = DELETE denied by default

-- ============================================================================
-- BUSINESSES - Merchant can view/manage only their own businesses
-- ============================================================================

-- SELECT policy: Merchant views only businesses they own
CREATE POLICY businesses_select_own
  ON businesses
  FOR SELECT
  USING (
    merchant_id = (
      SELECT id FROM merchant_accounts
      WHERE user_id = current_setting('app.user_id')::uuid
    )
  );

-- INSERT policy: Merchant can create only businesses they own
CREATE POLICY businesses_insert_own
  ON businesses
  FOR INSERT
  WITH CHECK (
    merchant_id = (
      SELECT id FROM merchant_accounts
      WHERE user_id = current_setting('app.user_id')::uuid
    )
  );

-- UPDATE policy: Merchant can update only their own businesses
CREATE POLICY businesses_update_own
  ON businesses
  FOR UPDATE
  USING (
    merchant_id = (
      SELECT id FROM merchant_accounts
      WHERE user_id = current_setting('app.user_id')::uuid
    )
  );

-- DELETE policy: Disable (archive instead, implement later)
-- No DELETE policy = DELETE denied by default

-- ============================================================================
-- BRANCHES - Merchant can view/manage only branches of their businesses
-- ============================================================================

-- SELECT policy: Merchant views only branches of their businesses
CREATE POLICY branches_select_own
  ON branches
  FOR SELECT
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.merchant_id = (
        SELECT id FROM merchant_accounts
        WHERE user_id = current_setting('app.user_id')::uuid
      )
    )
  );

-- INSERT policy: Merchant can create only branches of their businesses
CREATE POLICY branches_insert_own
  ON branches
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.merchant_id = (
        SELECT id FROM merchant_accounts
        WHERE user_id = current_setting('app.user_id')::uuid
      )
    )
  );

-- UPDATE policy: Merchant can update only branches of their businesses
CREATE POLICY branches_update_own
  ON branches
  FOR UPDATE
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.merchant_id = (
        SELECT id FROM merchant_accounts
        WHERE user_id = current_setting('app.user_id')::uuid
      )
    )
  );

-- DELETE policy: Disable (archive instead)
-- No DELETE policy = DELETE denied by default

-- ============================================================================
-- VERIFICATION: RLS Enabled Status
-- ============================================================================
-- Run after applying policies to confirm:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;
--
-- Expected result: All milestone 1 tables should show rowsecurity = true
-- ============================================================================
