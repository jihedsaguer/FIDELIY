-- Merchant customer list: a merchant may read the customer_accounts rows of
-- customers who hold a membership in a business the merchant owns.
-- users has no RLS (see 0001_rls.sql), so no policy is needed there.
--
-- The check lives in a SECURITY DEFINER function: a direct sub-select on
-- customer_business_memberships inside a customer_accounts policy would
-- re-enter customer_business_memberships_select_own, which reads
-- customer_accounts, and PostgreSQL would raise "infinite recursion detected
-- in policy". The function reads only a boolean and uses the session user.
CREATE OR REPLACE FUNCTION public.merchant_owns_customer_account(target_customer_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_business_memberships m
    JOIN public.businesses b ON b.id = m.business_id
    JOIN public.merchant_accounts ma ON ma.id = b.merchant_id
    WHERE m.customer_account_id = target_customer_account_id
      AND ma.user_id = current_setting('app.user_id')::uuid
  );
$$;--> statement-breakpoint
CREATE POLICY "customer_accounts_select_business_owner" ON "customer_accounts"
	FOR SELECT USING (public.merchant_owns_customer_account("id"));
