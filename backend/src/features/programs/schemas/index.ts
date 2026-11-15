import { sql } from 'drizzle-orm';
import {
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
