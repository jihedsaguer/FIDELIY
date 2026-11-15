import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businesses } from '../../merchants/schemas';
import { users } from '../../auth/schemas';

export const membershipStatusEnum = pgEnum('membership_status', [
  'active',
  'inactive',
]);

export const membershipEventTypeEnum = pgEnum('membership_event_type', [
  'joined',
  'left',
]);

export const customerAccounts = pgTable(
  'customer_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: uniqueIndex('customer_accounts_user_id_idx').on(t.userId),
  }),
);

export const customerBusinessMemberships = pgTable(
  'customer_business_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    status: membershipStatusEnum('status').notNull().default('active'),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    leftAt: timestamp('left_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    customerBusinessUnique: uniqueIndex(
      'customer_business_memberships_customer_business_unique',
    ).on(table.customerAccountId, table.businessId),
    customerStatusIdx: index(
      'customer_business_memberships_customer_status_idx',
    ).on(table.customerAccountId, table.status),
    businessIdx: index('customer_business_memberships_business_idx').on(
      table.businessId,
    ),
    idBusinessUnique: uniqueIndex(
      'customer_business_memberships_id_business_unique',
    ).on(table.id, table.businessId),
    lifecycle: check('customer_business_memberships_lifecycle', sql`(
      (status = 'active' AND left_at IS NULL)
      OR (status = 'inactive' AND left_at IS NOT NULL)
    )`),
  }),
);

export const membershipLifecycleEvents = pgTable(
  'membership_lifecycle_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => customerBusinessMemberships.id, {
        onDelete: 'restrict',
      }),
    type: membershipEventTypeEnum('type').notNull(),
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  },
  (table) => ({
    membershipIdx: index('membership_lifecycle_events_membership_idx').on(
      table.membershipId,
    ),
  }),
);

export const customerQrCredentials = pgTable(
  'customer_qr_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'restrict' }),
    credentialHash: varchar('credential_hash', { length: 64 })
      .notNull()
      .unique(),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    activeCustomerUnique: uniqueIndex(
      'customer_qr_credentials_active_customer_unique',
    )
      .on(table.customerAccountId)
      .where(sql`revoked_at IS NULL`),
  }),
);
