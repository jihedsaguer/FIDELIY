CREATE TYPE "program_type" AS ENUM ('stamps', 'points', 'both');--> statement-breakpoint
CREATE TYPE "program_configuration_type" AS ENUM ('stamps', 'points');--> statement-breakpoint
CREATE TYPE "program_status" AS ENUM ('active', 'inactive');--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" "program_type" NOT NULL,
	"version" integer NOT NULL,
	"status" "program_status" DEFAULT 'active' NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"deactivated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "programs_version_positive" CHECK ("version" >= 1),
	CONSTRAINT "programs_lifecycle_timestamps" CHECK (
		("status" = 'active' AND "deactivated_at" IS NULL)
		OR ("status" = 'inactive' AND "deactivated_at" IS NOT NULL)
	)
);--> statement-breakpoint
CREATE TABLE "program_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"type" "program_configuration_type" NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "program_configurations_settings_object" CHECK (jsonb_typeof("settings") = 'object')
);--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_business_id_businesses_id_fk"
	FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")
	ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_configurations" ADD CONSTRAINT "program_configurations_program_id_programs_id_fk"
	FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id")
	ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_business_version_unique"
	ON "programs" USING btree ("business_id", "version");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_active_business_unique"
	ON "programs" USING btree ("business_id")
	WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX "programs_business_id_idx"
	ON "programs" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_configurations_program_type_unique"
	ON "program_configurations" USING btree ("program_id", "type");--> statement-breakpoint
CREATE INDEX "program_configurations_program_id_idx"
	ON "program_configurations" USING btree ("program_id");--> statement-breakpoint
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program_configurations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "programs_select_own" ON "programs"
	FOR SELECT USING (
		"business_id" IN (
			SELECT b.id FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "programs_insert_own" ON "programs"
	FOR INSERT WITH CHECK (
		"business_id" IN (
			SELECT b.id FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "programs_update_own" ON "programs"
	FOR UPDATE
	USING (
		"business_id" IN (
			SELECT b.id FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	)
	WITH CHECK (
		"business_id" IN (
			SELECT b.id FROM businesses b
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "program_configurations_select_own" ON "program_configurations"
	FOR SELECT USING (
		EXISTS (
			SELECT 1
			FROM programs p
			JOIN businesses b ON b.id = p.business_id
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE p.id = "program_configurations"."program_id"
				AND ma.user_id = current_setting('app.user_id')::uuid
		)
	);--> statement-breakpoint
CREATE POLICY "program_configurations_insert_own" ON "program_configurations"
	FOR INSERT WITH CHECK (
		EXISTS (
			SELECT 1
			FROM programs p
			JOIN businesses b ON b.id = p.business_id
			JOIN merchant_accounts ma ON ma.id = b.merchant_id
			WHERE p.id = "program_configurations"."program_id"
				AND ma.user_id = current_setting('app.user_id')::uuid
		)
	);
