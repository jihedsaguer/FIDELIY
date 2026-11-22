-- Checkpoint 6B-C (DECISIONS.md #15, rules 5, 6, 8 and 14).
-- Purchase amount in integer millimes and the reversal reason live on the
-- transaction header; the points earning-rate snapshot lives on the entry.
-- The CHECK constraints are NOT VALID: rows written before 6B-C (for example
-- reversals without a reason) are append-only and cannot be backfilled; every
-- new row is checked.
ALTER TABLE "loyalty_transactions"
	ADD COLUMN "purchase_amount_millimes" bigint;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD COLUMN "reversal_reason" text;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_purchase_amount_non_negative"
	CHECK ("purchase_amount_millimes" IS NULL OR "purchase_amount_millimes" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "loyalty_transactions"
	ADD CONSTRAINT "loyalty_transactions_reversal_reason"
	CHECK (
		("category" = 'reversal' AND "reversal_reason" IS NOT NULL AND length("reversal_reason") BETWEEN 1 AND 500)
		OR ("category" <> 'reversal' AND "reversal_reason" IS NULL)
	) NOT VALID;--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries"
	ADD COLUMN "earning_rate_hundredths" integer;--> statement-breakpoint
ALTER TABLE "loyalty_activity_entries"
	ADD CONSTRAINT "loyalty_activity_entries_earning_rate_snapshot"
	CHECK (
		"earning_rate_hundredths" IS NULL
		OR ("activity_type" = 'points' AND "earning_rate_hundredths" > 0)
	) NOT VALID;
