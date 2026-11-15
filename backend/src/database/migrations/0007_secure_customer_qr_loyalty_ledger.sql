ALTER TABLE "customer_qr_credentials"
	RENAME COLUMN "credential" TO "credential_hash";--> statement-breakpoint
UPDATE "customer_qr_credentials"
	SET "credential_hash" = encode(sha256(convert_to("credential_hash", 'UTF8')), 'hex');--> statement-breakpoint
ALTER TABLE "customer_qr_credentials"
	ALTER COLUMN "credential_hash" TYPE varchar(64);--> statement-breakpoint
CREATE POLICY "customer_business_memberships_select_merchant_business" ON "customer_business_memberships"
	FOR SELECT USING (
		"business_id" IN (
			SELECT b.id
			FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_qr_credentials_select_merchant_members" ON "customer_qr_credentials"
	FOR SELECT USING (
		EXISTS (
			SELECT 1
			FROM customer_business_memberships m
			WHERE m.customer_account_id = "customer_qr_credentials"."customer_account_id"
				AND m.status = 'active'
				AND m.business_id IN (
					SELECT b.id
					FROM businesses b
					JOIN merchant_accounts ma ON ma.id = b.merchant_id
					WHERE ma.user_id = current_setting('app.user_id')::uuid
				)
		)
	);--> statement-breakpoint
CREATE TYPE "loyalty_transaction_category" AS ENUM ('purchase', 'manual_adjustment', 'reversal');--> statement-breakpoint
CREATE TYPE "loyalty_activity_type" AS ENUM ('stamps', 'points');--> statement-breakpoint
CREATE UNIQUE INDEX "customer_business_memberships_id_business_unique"
	ON "customer_business_memberships" USING btree ("id", "business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_id_business_unique"
	ON "branches" USING btree ("id", "business_id");--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"branch_id" uuid,
	"merchant_account_id" uuid NOT NULL,
	"category" "loyalty_transaction_category" NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"reverses_transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_transactions_idempotency_key_length" CHECK (length("idempotency_key") BETWEEN 1 AND 128),
	CONSTRAINT "loyalty_transactions_fingerprint_format" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "loyalty_transactions_reversal_category" CHECK (
		("category" = 'reversal' AND "reverses_transaction_id" IS NOT NULL)
		OR ("category" <> 'reversal' AND "reverses_transaction_id" IS NULL)
	)
);--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_business_id_businesses_id_fk"
	FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_merchant_account_id_merchant_accounts_id_fk"
	FOREIGN KEY ("merchant_account_id") REFERENCES "public"."merchant_accounts"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_membership_business_fk"
	FOREIGN KEY ("membership_id", "business_id")
	REFERENCES "public"."customer_business_memberships"("id", "business_id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_branch_business_fk"
	FOREIGN KEY ("branch_id", "business_id")
	REFERENCES "public"."branches"("id", "business_id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_transactions_id_business_membership_unique"
	ON "loyalty_transactions" USING btree ("id", "business_id", "membership_id");--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_reverses_transaction_fk"
	FOREIGN KEY ("reverses_transaction_id", "business_id", "membership_id")
	REFERENCES "public"."loyalty_transactions"("id", "business_id", "membership_id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_transactions_business_idempotency_unique"
	ON "loyalty_transactions" USING btree ("business_id", "idempotency_key");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_business_idx"
	ON "loyalty_transactions" USING btree ("business_id", "occurred_at");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_membership_idx"
	ON "loyalty_transactions" USING btree ("membership_id", "occurred_at");--> statement-breakpoint
CREATE TABLE "loyalty_activity_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"activity_type" "loyalty_activity_type" NOT NULL,
	"delta" integer NOT NULL,
	"program_configuration_id" uuid NOT NULL,
	"reverses_entry_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_activity_entries_nonzero_delta" CHECK ("delta" <> 0)
);--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries"
	ADD CONSTRAINT "loyalty_activity_entries_transaction_id_loyalty_transactions_id_fk"
	FOREIGN KEY ("transaction_id") REFERENCES "public"."loyalty_transactions"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries"
	ADD CONSTRAINT "loyalty_activity_entries_program_configuration_id_program_configurations_id_fk"
	FOREIGN KEY ("program_configuration_id") REFERENCES "public"."program_configurations"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries"
	ADD CONSTRAINT "loyalty_activity_entries_reverses_entry_fk"
	FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."loyalty_activity_entries"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_activity_entries_transaction_idx"
	ON "loyalty_activity_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "loyalty_activity_entries_configuration_idx"
	ON "loyalty_activity_entries" USING btree ("program_configuration_id");--> statement-breakpoint
CREATE INDEX "loyalty_activity_entries_reversal_idx"
	ON "loyalty_activity_entries" USING btree ("reverses_entry_id");--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "loyalty_transactions_select_business_owner" ON "loyalty_transactions"
	FOR SELECT USING (
		"business_id" IN (
			SELECT b.id
			FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "loyalty_transactions_select_customer_membership" ON "loyalty_transactions"
	FOR SELECT USING (
		EXISTS (
			SELECT 1
			FROM customer_business_memberships m
			JOIN customer_accounts ca ON ca.id = m.customer_account_id
			WHERE m.id = "loyalty_transactions"."membership_id"
				AND ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "loyalty_transactions_insert_business_owner" ON "loyalty_transactions"
	FOR INSERT WITH CHECK (
		"business_id" IN (
			SELECT b.id
			FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
		AND "merchant_account_id" IN (
			SELECT ma.id FROM merchant_accounts ma
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "loyalty_activity_entries_select_transaction_owner" ON "loyalty_activity_entries"
	FOR SELECT USING (
		EXISTS (
			SELECT 1 FROM loyalty_transactions t
			WHERE t.id = "loyalty_activity_entries"."transaction_id"
		)
	);--> statement-breakpoint
CREATE POLICY "loyalty_activity_entries_insert_business_owner" ON "loyalty_activity_entries"
	FOR INSERT WITH CHECK (
		EXISTS (
			SELECT 1
			FROM loyalty_transactions t
			JOIN businesses b ON b.id = t.business_id
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE t.id = "loyalty_activity_entries"."transaction_id"
				AND ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "reject_loyalty_ledger_mutation"()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $$
	BEGIN
		RAISE EXCEPTION 'Loyalty ledger records are append-only';
	END;
	$$;--> statement-breakpoint
CREATE TRIGGER "loyalty_transactions_append_only"
	BEFORE UPDATE OR DELETE ON "loyalty_transactions"
	FOR EACH ROW EXECUTE FUNCTION "reject_loyalty_ledger_mutation"();--> statement-breakpoint
CREATE TRIGGER "loyalty_activity_entries_append_only"
	BEFORE UPDATE OR DELETE ON "loyalty_activity_entries"
	FOR EACH ROW EXECUTE FUNCTION "reject_loyalty_ledger_mutation"();
