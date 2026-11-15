DROP INDEX "sessions_user_id_idx";--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.provision_customer_account_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number_verified THEN
    INSERT INTO public.customer_accounts (user_id, phone_number, phone_verified)
    VALUES (NEW.id, NEW.phone_number, true)
    ON CONFLICT (user_id) DO UPDATE
      SET phone_number = EXCLUDED.phone_number,
          phone_verified = true,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.provision_customer_account_from_user() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER users_provision_customer_account_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.provision_customer_account_from_user();--> statement-breakpoint
CREATE TRIGGER users_provision_customer_account_update
AFTER UPDATE OF phone_number, phone_number_verified ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.provision_customer_account_from_user();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.provision_merchant_account_from_credential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.provider = 'credential' THEN
    INSERT INTO public.merchant_accounts (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.provision_merchant_account_from_credential() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER accounts_provision_merchant_account_insert
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.provision_merchant_account_from_credential();
