import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { businesses } from '../../merchants/schemas';

export const programTypeEnum = pgEnum('program_type', [
  'stamps',
  'points',
  'both',
]);

export const programConfigurationTypeEnum = pgEnum(
  'program_configuration_type',
  ['stamps', 'points'],
);

export const programStatusEnum = pgEnum('program_status', [
  'active',
  'inactive',
]);

export const programs = pgTable(
  'programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }),
    description: varchar('description', { length: 1000 }),
    type: programTypeEnum('type').notNull(),
    version: integer('version').notNull(),
    status: programStatusEnum('status').notNull().default('active'),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    deactivatedAt: timestamp('deactivated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    businessVersionUnique: uniqueIndex('programs_business_version_unique').on(
      table.businessId,
      table.version,
    ),
    activeBusinessUnique: uniqueIndex('programs_active_business_unique')
      .on(table.businessId)
      .where(sql`status = 'active'`),
    businessIdIdx: index('programs_business_id_idx').on(table.businessId),
    versionPositive: check(
      'programs_version_positive',
      sql`version >= 1`,
    ),
    lifecycleTimestamps: check(
      'programs_lifecycle_timestamps',
      sql`(status = 'active' AND deactivated_at IS NULL)
        OR (status = 'inactive' AND deactivated_at IS NOT NULL)`,
    ),
  }),
);

export const programConfigurations = pgTable(
  'program_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    type: programConfigurationTypeEnum('type').notNull(),
    settings: jsonb('settings')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    programTypeUnique: uniqueIndex(
      'program_configurations_program_type_unique',
    ).on(table.programId, table.type),
    programIdIdx: index('program_configurations_program_id_idx').on(
      table.programId,
    ),
    settingsObject: check(
      'program_configurations_settings_object',
      sql`jsonb_typeof(settings) = 'object'`,
    ),
  }),
);


export const rewards = pgTable(
  'rewards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    pointsCost: integer('points_cost').notNull().default(0),
    stampsCost: integer('stamps_cost'),
    isActive: boolean('is_active').notNull().default(true),
    maxRedemptions: integer('max_redemptions'),
    currentRedemptions: integer('current_redemptions').notNull().default(0),
    validFrom: timestamp('valid_from'),
    validUntil: timestamp('valid_until'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    programIdIdx: index('rewards_program_id_idx').on(table.programId),
    activeIdx: index('rewards_active_idx').on(table.programId).where(sql`is_active = true`),
    pointsCostPositive: check('rewards_points_cost_positive', sql`points_cost >= 0`),
    stampsCostNonNegative: check('rewards_stamps_cost_nonnegative', sql`stamps_cost IS NULL OR stamps_cost >= 0`),
    redemptionsValid: check(
      'rewards_redemptions_valid',
      sql`max_redemptions IS NULL OR current_redemptions <= max_redemptions`,
    ),
    validDateRange: check(
      'rewards_valid_date_range',
      sql`valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until`,
    ),
  }),
);
