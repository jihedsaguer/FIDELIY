-- Migration: 0010_phone_unverified_provisioning.sql
-- Update customer account provisioning trigger to support unverified phone sign-in

CREATE OR REPLACE FUNCTION public.provision_customer_account_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Case 1: Phone with verification (OTP or recovery flow)
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number_verified THEN
    INSERT INTO public.customer_accounts (user_id, phone_number, phone_verified)
    VALUES (NEW.id, NEW.phone_number, true)
    ON CONFLICT (user_id) DO UPDATE
      SET phone_number = EXCLUDED.phone_number,
          phone_verified = true,
          updated_at = now();
  
  -- Case 2: Phone without verification (new direct sign-in)
  ELSIF NEW.phone_number IS NOT NULL AND 
        NEW.phone_number_verified IS FALSE AND
        (OLD IS NULL OR OLD.phone_number IS NULL) THEN
    INSERT INTO public.customer_accounts (user_id, phone_number, phone_verified)
    VALUES (NEW.id, NEW.phone_number, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
