ALTER TABLE "customer_qr_credentials"
	ADD COLUMN "short_code_hash" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "customer_qr_credentials_active_short_code_unique"
	ON "customer_qr_credentials" ("short_code_hash")
	WHERE "revoked_at" IS NULL AND "short_code_hash" IS NOT NULL;
