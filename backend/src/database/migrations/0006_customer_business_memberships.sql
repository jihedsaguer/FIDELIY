CREATE TYPE "membership_status" AS ENUM ('active', 'inactive');--> statement-breakpoint
CREATE TYPE "membership_event_type" AS ENUM ('joined', 'left');--> statement-breakpoint
ALTER TABLE "businesses"
	ADD COLUMN "public_qr_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_public_qr_id_idx"
	ON "businesses" USING btree ("public_qr_id");--> statement-breakpoint
CREATE TABLE "customer_business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_account_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_business_memberships_lifecycle" CHECK (
		("status" = 'active' AND "left_at" IS NULL)
		OR ("status" = 'inactive' AND "left_at" IS NOT NULL)
	)
);--> statement-breakpoint
CREATE TABLE "membership_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"type" "membership_event_type" NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "customer_qr_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_account_id" uuid NOT NULL,
	"credential" varchar(64) NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);--> statement-breakpoint
ALTER TABLE "customer_business_memberships"
	ADD CONSTRAINT "customer_business_memberships_customer_account_id_customer_accounts_id_fk"
	FOREIGN KEY ("customer_account_id") REFERENCES "public"."customer_accounts"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_business_memberships"
	ADD CONSTRAINT "customer_business_memberships_business_id_businesses_id_fk"
	FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_lifecycle_events"
	ADD CONSTRAINT "membership_lifecycle_events_membership_id_customer_business_memberships_id_fk"
	FOREIGN KEY ("membership_id") REFERENCES "public"."customer_business_memberships"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_qr_credentials"
	ADD CONSTRAINT "customer_qr_credentials_customer_account_id_customer_accounts_id_fk"
	FOREIGN KEY ("customer_account_id") REFERENCES "public"."customer_accounts"("id")
	ON DELETE RESTRICT ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_business_memberships_customer_business_unique"
	ON "customer_business_memberships" USING btree ("customer_account_id", "business_id");--> statement-breakpoint
CREATE INDEX "customer_business_memberships_customer_status_idx"
	ON "customer_business_memberships" USING btree ("customer_account_id", "status");--> statement-breakpoint
CREATE INDEX "customer_business_memberships_business_idx"
	ON "customer_business_memberships" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "membership_lifecycle_events_membership_idx"
	ON "membership_lifecycle_events" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_qr_credentials_credential_unique"
	ON "customer_qr_credentials" USING btree ("credential");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_qr_credentials_active_customer_unique"
	ON "customer_qr_credentials" USING btree ("customer_account_id")
	WHERE "revoked_at" IS NULL;--> statement-breakpoint
ALTER TABLE "customer_business_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "membership_lifecycle_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_qr_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "businesses_customer_public_qr_select" ON "businesses"
	FOR SELECT USING (
		"public_qr_id" IS NOT NULL
		AND EXISTS (
			SELECT 1 FROM customer_accounts ca
			WHERE ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "branches_customer_public_qr_select" ON "branches"
	FOR SELECT USING (
		EXISTS (
			SELECT 1
			FROM customer_accounts ca
			JOIN businesses b ON b.id = "branches"."business_id"
			WHERE ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "programs_customer_active_select" ON "programs"
	FOR SELECT USING (
		"status" = 'active'
		AND EXISTS (
			SELECT 1
			FROM customer_accounts ca
			JOIN businesses b ON b.id = "programs"."business_id"
			WHERE ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "program_configurations_customer_active_select" ON "program_configurations"
	FOR SELECT USING (
		EXISTS (
			SELECT 1
			FROM programs p
			JOIN customer_accounts ca ON ca.user_id = current_setting('app.user_id')::uuid
			JOIN businesses b ON b.id = p.business_id
			WHERE p.id = "program_configurations"."program_id"
				AND p.status = 'active'
		)
	);--> statement-breakpoint
CREATE POLICY "customer_business_memberships_select_own" ON "customer_business_memberships"
	FOR SELECT USING (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_business_memberships_insert_own" ON "customer_business_memberships"
	FOR INSERT WITH CHECK (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_business_memberships_update_own" ON "customer_business_memberships"
	FOR UPDATE
	USING (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	)
	WITH CHECK (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "membership_lifecycle_events_select_own" ON "membership_lifecycle_events"
	FOR SELECT USING (
		EXISTS (
			SELECT 1 FROM customer_business_memberships m
			JOIN customer_accounts ca ON ca.id = m.customer_account_id
			WHERE m.id = "membership_lifecycle_events"."membership_id"
				AND ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "membership_lifecycle_events_insert_own" ON "membership_lifecycle_events"
	FOR INSERT WITH CHECK (
		EXISTS (
			SELECT 1 FROM customer_business_memberships m
			JOIN customer_accounts ca ON ca.id = m.customer_account_id
			WHERE m.id = "membership_lifecycle_events"."membership_id"
				AND ca.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_qr_credentials_select_own" ON "customer_qr_credentials"
	FOR SELECT USING (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_qr_credentials_insert_own" ON "customer_qr_credentials"
	FOR INSERT WITH CHECK (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "customer_qr_credentials_update_own" ON "customer_qr_credentials"
	FOR UPDATE
	USING (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	)
	WITH CHECK (
		"customer_account_id" IN (
			SELECT id FROM customer_accounts
			WHERE user_id = current_setting('app.user_id')::uuid
		)
	);
