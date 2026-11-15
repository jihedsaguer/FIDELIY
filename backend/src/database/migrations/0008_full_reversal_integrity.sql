CREATE UNIQUE INDEX "loyalty_transactions_reverses_transaction_unique"
	ON "loyalty_transactions" USING btree ("reverses_transaction_id")
	WHERE "reverses_transaction_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "loyalty_activity_entries_reversal_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_activity_entries_reverses_entry_unique"
	ON "loyalty_activity_entries" USING btree ("reverses_entry_id")
	WHERE "reverses_entry_id" IS NOT NULL;

