import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customerBusinessMemberships } from '../../customers/schemas';
import { branches, businesses, merchantAccounts } from '../../merchants/schemas';
import { programConfigurations } from '../../programs/schemas';

export const loyaltyTransactionCategoryEnum = pgEnum(
  'loyalty_transaction_category',
  // 'redemption' added by migration 0012 (Checkpoint 6B-C).
  ['purchase', 'manual_adjustment', 'reversal', 'redemption'],
);

export const loyaltyActivityTypeEnum = pgEnum('loyalty_activity_type', [
  'stamps',
  'points',
]);

export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    membershipId: uuid('membership_id').notNull(),
    branchId: uuid('branch_id'),
    merchantAccountId: uuid('merchant_account_id')
      .notNull()
      .references(() => merchantAccounts.id, { onDelete: 'restrict' }),
    category: loyaltyTransactionCategoryEnum('category').notNull(),
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    requestFingerprint: varchar('request_fingerprint', { length: 64 }).notNull(),
    reversesTransactionId: uuid('reverses_transaction_id'),
    // Migration 0013: integer millimes (TND x 1000) and the reversal reason.
    purchaseAmountMillimes: bigint('purchase_amount_millimes', { mode: 'number' }),
    reversalReason: text('reversal_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    businessIdempotencyUnique: uniqueIndex(
      'loyalty_transactions_business_idempotency_unique',
    ).on(table.businessId, table.idempotencyKey),
    businessIdx: index('loyalty_transactions_business_idx').on(
      table.businessId,
      table.occurredAt,
    ),
    membershipIdx: index('loyalty_transactions_membership_idx').on(
      table.membershipId,
      table.occurredAt,
    ),
    idempotencyKeyLength: check(
      'loyalty_transactions_idempotency_key_length',
      sql`length(idempotency_key) BETWEEN 1 AND 128`,
    ),
    fingerprintFormat: check(
      'loyalty_transactions_fingerprint_format',
      sql`request_fingerprint ~ '^[0-9a-f]{64}$'`,
    ),
    reversalCategory: check(
      'loyalty_transactions_reversal_category',
      sql`(category = 'reversal' AND reverses_transaction_id IS NOT NULL)
        OR (category <> 'reversal' AND reverses_transaction_id IS NULL)`,
    ),
    // Migration 0013 adds the two checks below as NOT VALID (historical
    // append-only rows are not re-checked).
    purchaseAmountNonNegative: check(
      'loyalty_transactions_purchase_amount_non_negative',
      sql`purchase_amount_millimes IS NULL OR purchase_amount_millimes >= 0`,
    ),
    reversalReasonRule: check(
      'loyalty_transactions_reversal_reason',
      sql`(category = 'reversal' AND reversal_reason IS NOT NULL AND length(reversal_reason) BETWEEN 1 AND 500)
        OR (category <> 'reversal' AND reversal_reason IS NULL)`,
    ),
    idBusinessMembershipUnique: uniqueIndex(
      'loyalty_transactions_id_business_membership_unique',
    ).on(table.id, table.businessId, table.membershipId),
    membershipBusinessFk: foreignKey({
      columns: [table.membershipId, table.businessId],
      foreignColumns: [
        customerBusinessMemberships.id,
        customerBusinessMemberships.businessId,
      ],
      name: 'loyalty_transactions_membership_business_fk',
    }),
    branchBusinessFk: foreignKey({
      columns: [table.branchId, table.businessId],
      foreignColumns: [branches.id, branches.businessId],
      name: 'loyalty_transactions_branch_business_fk',
    }),
    reversesTransactionUnique: uniqueIndex(
      'loyalty_transactions_reverses_transaction_unique',
    )
      .on(table.reversesTransactionId)
      .where(sql`reverses_transaction_id IS NOT NULL`),
    reversesTransactionFk: foreignKey({
      columns: [
        table.reversesTransactionId,
        table.businessId,
        table.membershipId,
      ],
      foreignColumns: [
        table.id,
        table.businessId,
        table.membershipId,
      ],
      name: 'loyalty_transactions_reverses_transaction_fk',
    }),
  }),
);

export const loyaltyActivityEntries = pgTable(
  'loyalty_activity_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => loyaltyTransactions.id, { onDelete: 'restrict' }),
    activityType: loyaltyActivityTypeEnum('activity_type').notNull(),
    delta: integer('delta').notNull(),
    programConfigurationId: uuid('program_configuration_id')
      .notNull()
      .references(() => programConfigurations.id, { onDelete: 'restrict' }),
    reversesEntryId: uuid('reverses_entry_id'),
    // Migration 0013: points earning-rate snapshot in hundredths of a point per TND.
    earningRateHundredths: integer('earning_rate_hundredths'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    transactionIdx: index('loyalty_activity_entries_transaction_idx').on(
      table.transactionId,
    ),
    configurationIdx: index(
      'loyalty_activity_entries_configuration_idx',
    ).on(table.programConfigurationId),
    reversesEntryUnique: uniqueIndex(
      'loyalty_activity_entries_reverses_entry_unique',
    )
      .on(table.reversesEntryId)
      .where(sql`reverses_entry_id IS NOT NULL`),
    nonzeroDelta: check(
      'loyalty_activity_entries_nonzero_delta',
      sql`delta <> 0`,
    ),
    earningRateSnapshot: check(
      'loyalty_activity_entries_earning_rate_snapshot',
      sql`earning_rate_hundredths IS NULL OR (activity_type = 'points' AND earning_rate_hundredths > 0)`,
    ),
    reversesEntryFk: foreignKey({
      columns: [table.reversesEntryId],
      foreignColumns: [table.id],
      name: 'loyalty_activity_entries_reverses_entry_fk',
    }),
  }),
);
