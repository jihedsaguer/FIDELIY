-- Checkpoint 6B-C (DECISIONS.md #15, rule 7): redemptions get their own category.
-- Kept in its own file: a value added by ALTER TYPE ... ADD VALUE cannot be used
-- until the adding transaction commits. The drizzle migrator applies all pending
-- files in one transaction, so no later migration may reference 'redemption'.
ALTER TYPE "loyalty_transaction_category" ADD VALUE IF NOT EXISTS 'redemption';
