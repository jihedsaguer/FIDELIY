"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerQrCredentials = exports.membershipLifecycleEvents = exports.customerBusinessMemberships = exports.customerAccounts = exports.membershipEventTypeEnum = exports.membershipStatusEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const schemas_1 = require("../../merchants/schemas");
const schemas_2 = require("../../auth/schemas");
exports.membershipStatusEnum = (0, pg_core_1.pgEnum)('membership_status', [
    'active',
    'inactive',
]);
exports.membershipEventTypeEnum = (0, pg_core_1.pgEnum)('membership_event_type', [
    'joined',
    'left',
]);
exports.customerAccounts = (0, pg_core_1.pgTable)('customer_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .unique()
        .references(() => schemas_2.users.id, { onDelete: 'cascade' }),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 20 }),
    phoneVerified: (0, pg_core_1.boolean)('phone_verified').default(false).notNull(),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: (0, pg_core_1.uniqueIndex)('customer_accounts_user_id_idx').on(t.userId),
}));
exports.customerBusinessMemberships = (0, pg_core_1.pgTable)('customer_business_memberships', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    customerAccountId: (0, pg_core_1.uuid)('customer_account_id')
        .notNull()
        .references(() => exports.customerAccounts.id, { onDelete: 'restrict' }),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(() => schemas_1.businesses.id, { onDelete: 'restrict' }),
    status: (0, exports.membershipStatusEnum)('status').notNull().default('active'),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').notNull().defaultNow(),
    leftAt: (0, pg_core_1.timestamp)('left_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (table) => ({
    customerBusinessUnique: (0, pg_core_1.uniqueIndex)('customer_business_memberships_customer_business_unique').on(table.customerAccountId, table.businessId),
    customerStatusIdx: (0, pg_core_1.index)('customer_business_memberships_customer_status_idx').on(table.customerAccountId, table.status),
    businessIdx: (0, pg_core_1.index)('customer_business_memberships_business_idx').on(table.businessId),
    idBusinessUnique: (0, pg_core_1.uniqueIndex)('customer_business_memberships_id_business_unique').on(table.id, table.businessId),
    lifecycle: (0, pg_core_1.check)('customer_business_memberships_lifecycle', (0, drizzle_orm_1.sql) `(
      (status = 'active' AND left_at IS NULL)
      OR (status = 'inactive' AND left_at IS NOT NULL)
    )`),
}));
exports.membershipLifecycleEvents = (0, pg_core_1.pgTable)('membership_lifecycle_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    membershipId: (0, pg_core_1.uuid)('membership_id')
        .notNull()
        .references(() => exports.customerBusinessMemberships.id, {
        onDelete: 'restrict',
    }),
    type: (0, exports.membershipEventTypeEnum)('type').notNull(),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at').notNull().defaultNow(),
}, (table) => ({
    membershipIdx: (0, pg_core_1.index)('membership_lifecycle_events_membership_idx').on(table.membershipId),
}));
exports.customerQrCredentials = (0, pg_core_1.pgTable)('customer_qr_credentials', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    customerAccountId: (0, pg_core_1.uuid)('customer_account_id')
        .notNull()
        .references(() => exports.customerAccounts.id, { onDelete: 'restrict' }),
    credentialHash: (0, pg_core_1.varchar)('credential_hash', { length: 64 })
        .notNull()
        .unique(),
    issuedAt: (0, pg_core_1.timestamp)('issued_at').notNull().defaultNow(),
    revokedAt: (0, pg_core_1.timestamp)('revoked_at'),
}, (table) => ({
    activeCustomerUnique: (0, pg_core_1.uniqueIndex)('customer_qr_credentials_active_customer_unique')
        .on(table.customerAccountId)
        .where((0, drizzle_orm_1.sql) `revoked_at IS NULL`),
}));
//# sourceMappingURL=index.js.map