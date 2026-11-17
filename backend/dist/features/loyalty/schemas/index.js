"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyActivityEntries = exports.loyaltyTransactions = exports.loyaltyActivityTypeEnum = exports.loyaltyTransactionCategoryEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const schemas_1 = require("../../customers/schemas");
const schemas_2 = require("../../merchants/schemas");
const schemas_3 = require("../../programs/schemas");
exports.loyaltyTransactionCategoryEnum = (0, pg_core_1.pgEnum)('loyalty_transaction_category', ['purchase', 'manual_adjustment', 'reversal']);
exports.loyaltyActivityTypeEnum = (0, pg_core_1.pgEnum)('loyalty_activity_type', [
    'stamps',
    'points',
]);
exports.loyaltyTransactions = (0, pg_core_1.pgTable)('loyalty_transactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(() => schemas_2.businesses.id, { onDelete: 'restrict' }),
    membershipId: (0, pg_core_1.uuid)('membership_id').notNull(),
    branchId: (0, pg_core_1.uuid)('branch_id'),
    merchantAccountId: (0, pg_core_1.uuid)('merchant_account_id')
        .notNull()
        .references(() => schemas_2.merchantAccounts.id, { onDelete: 'restrict' }),
    category: (0, exports.loyaltyTransactionCategoryEnum)('category').notNull(),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at').notNull().defaultNow(),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 128 }).notNull(),
    requestFingerprint: (0, pg_core_1.varchar)('request_fingerprint', { length: 64 }).notNull(),
    reversesTransactionId: (0, pg_core_1.uuid)('reverses_transaction_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => ({
    businessIdempotencyUnique: (0, pg_core_1.uniqueIndex)('loyalty_transactions_business_idempotency_unique').on(table.businessId, table.idempotencyKey),
    businessIdx: (0, pg_core_1.index)('loyalty_transactions_business_idx').on(table.businessId, table.occurredAt),
    membershipIdx: (0, pg_core_1.index)('loyalty_transactions_membership_idx').on(table.membershipId, table.occurredAt),
    idempotencyKeyLength: (0, pg_core_1.check)('loyalty_transactions_idempotency_key_length', (0, drizzle_orm_1.sql) `length(idempotency_key) BETWEEN 1 AND 128`),
    fingerprintFormat: (0, pg_core_1.check)('loyalty_transactions_fingerprint_format', (0, drizzle_orm_1.sql) `request_fingerprint ~ '^[0-9a-f]{64}$'`),
    reversalCategory: (0, pg_core_1.check)('loyalty_transactions_reversal_category', (0, drizzle_orm_1.sql) `(category = 'reversal' AND reverses_transaction_id IS NOT NULL)
        OR (category <> 'reversal' AND reverses_transaction_id IS NULL)`),
    idBusinessMembershipUnique: (0, pg_core_1.uniqueIndex)('loyalty_transactions_id_business_membership_unique').on(table.id, table.businessId, table.membershipId),
    membershipBusinessFk: (0, pg_core_1.foreignKey)({
        columns: [table.membershipId, table.businessId],
        foreignColumns: [
            schemas_1.customerBusinessMemberships.id,
            schemas_1.customerBusinessMemberships.businessId,
        ],
        name: 'loyalty_transactions_membership_business_fk',
    }),
    branchBusinessFk: (0, pg_core_1.foreignKey)({
        columns: [table.branchId, table.businessId],
        foreignColumns: [schemas_2.branches.id, schemas_2.branches.businessId],
        name: 'loyalty_transactions_branch_business_fk',
    }),
    reversesTransactionUnique: (0, pg_core_1.uniqueIndex)('loyalty_transactions_reverses_transaction_unique')
        .on(table.reversesTransactionId)
        .where((0, drizzle_orm_1.sql) `reverses_transaction_id IS NOT NULL`),
    reversesTransactionFk: (0, pg_core_1.foreignKey)({
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
}));
exports.loyaltyActivityEntries = (0, pg_core_1.pgTable)('loyalty_activity_entries', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    transactionId: (0, pg_core_1.uuid)('transaction_id')
        .notNull()
        .references(() => exports.loyaltyTransactions.id, { onDelete: 'restrict' }),
    activityType: (0, exports.loyaltyActivityTypeEnum)('activity_type').notNull(),
    delta: (0, pg_core_1.integer)('delta').notNull(),
    programConfigurationId: (0, pg_core_1.uuid)('program_configuration_id')
        .notNull()
        .references(() => schemas_3.programConfigurations.id, { onDelete: 'restrict' }),
    reversesEntryId: (0, pg_core_1.uuid)('reverses_entry_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => ({
    transactionIdx: (0, pg_core_1.index)('loyalty_activity_entries_transaction_idx').on(table.transactionId),
    configurationIdx: (0, pg_core_1.index)('loyalty_activity_entries_configuration_idx').on(table.programConfigurationId),
    reversesEntryUnique: (0, pg_core_1.uniqueIndex)('loyalty_activity_entries_reverses_entry_unique')
        .on(table.reversesEntryId)
        .where((0, drizzle_orm_1.sql) `reverses_entry_id IS NOT NULL`),
    nonzeroDelta: (0, pg_core_1.check)('loyalty_activity_entries_nonzero_delta', (0, drizzle_orm_1.sql) `delta <> 0`),
    reversesEntryFk: (0, pg_core_1.foreignKey)({
        columns: [table.reversesEntryId],
        foreignColumns: [table.id],
        name: 'loyalty_activity_entries_reverses_entry_fk',
    }),
}));
//# sourceMappingURL=index.js.map