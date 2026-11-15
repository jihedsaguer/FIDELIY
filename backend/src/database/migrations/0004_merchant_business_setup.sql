ALTER TABLE "businesses" ADD COLUMN "business_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "phone_publicly_displayed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "phone_visibility_configured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "logo_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "theme_primary_color" varchar(7);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "theme_accent_color" varchar(7);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DROP INDEX "branches_business_id_idx";--> statement-breakpoint
CREATE INDEX "branches_business_id_idx" ON "branches" USING btree ("business_id");
