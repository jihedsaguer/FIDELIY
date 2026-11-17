"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewards = exports.programConfigurations = exports.programs = exports.programStatusEnum = exports.programConfigurationTypeEnum = exports.programTypeEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const schemas_1 = require("../../merchants/schemas");
exports.programTypeEnum = (0, pg_core_1.pgEnum)('program_type', [
    'stamps',
    'points',
    'both',
]);
exports.programConfigurationTypeEnum = (0, pg_core_1.pgEnum)('program_configuration_type', ['stamps', 'points']);
exports.programStatusEnum = (0, pg_core_1.pgEnum)('program_status', [
    'active',
    'inactive',
]);
exports.programs = (0, pg_core_1.pgTable)('programs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(() => schemas_1.businesses.id, { onDelete: 'restrict' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    description: (0, pg_core_1.varchar)('description', { length: 1000 }),
    type: (0, exports.programTypeEnum)('type').notNull(),
    version: (0, pg_core_1.integer)('version').notNull(),
    status: (0, exports.programStatusEnum)('status').notNull().default('active'),
    activatedAt: (0, pg_core_1.timestamp)('activated_at').notNull().defaultNow(),
    deactivatedAt: (0, pg_core_1.timestamp)('deactivated_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => ({
    businessVersionUnique: (0, pg_core_1.uniqueIndex)('programs_business_version_unique').on(table.businessId, table.version),
    activeBusinessUnique: (0, pg_core_1.uniqueIndex)('programs_active_business_unique')
        .on(table.businessId)
        .where((0, drizzle_orm_1.sql) `status = 'active'`),
    businessIdIdx: (0, pg_core_1.index)('programs_business_id_idx').on(table.businessId),
    versionPositive: (0, pg_core_1.check)('programs_version_positive', (0, drizzle_orm_1.sql) `version >= 1`),
    lifecycleTimestamps: (0, pg_core_1.check)('programs_lifecycle_timestamps', (0, drizzle_orm_1.sql) `(status = 'active' AND deactivated_at IS NULL)
        OR (status = 'inactive' AND deactivated_at IS NOT NULL)`),
}));
exports.programConfigurations = (0, pg_core_1.pgTable)('program_configurations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    programId: (0, pg_core_1.uuid)('program_id')
        .notNull()
        .references(() => exports.programs.id, { onDelete: 'restrict' }),
    type: (0, exports.programConfigurationTypeEnum)('type').notNull(),
    settings: (0, pg_core_1.jsonb)('settings')
        .$type()
        .notNull()
        .default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => ({
    programTypeUnique: (0, pg_core_1.uniqueIndex)('program_configurations_program_type_unique').on(table.programId, table.type),
    programIdIdx: (0, pg_core_1.index)('program_configurations_program_id_idx').on(table.programId),
    settingsObject: (0, pg_core_1.check)('program_configurations_settings_object', (0, drizzle_orm_1.sql) `jsonb_typeof(settings) = 'object'`),
}));
exports.rewards = (0, pg_core_1.pgTable)('rewards', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    programId: (0, pg_core_1.uuid)('program_id')
        .notNull()
        .references(() => exports.programs.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.varchar)('description', { length: 1000 }),
    pointsCost: (0, pg_core_1.integer)('points_cost').notNull().default(0),
    stampsCost: (0, pg_core_1.integer)('stamps_cost'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    maxRedemptions: (0, pg_core_1.integer)('max_redemptions'),
    currentRedemptions: (0, pg_core_1.integer)('current_redemptions').notNull().default(0),
    validFrom: (0, pg_core_1.timestamp)('valid_from'),
    validUntil: (0, pg_core_1.timestamp)('valid_until'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (table) => ({
    programIdIdx: (0, pg_core_1.index)('rewards_program_id_idx').on(table.programId),
    activeIdx: (0, pg_core_1.index)('rewards_active_idx').on(table.programId).where((0, drizzle_orm_1.sql) `is_active = true`),
    pointsCostPositive: (0, pg_core_1.check)('rewards_points_cost_positive', (0, drizzle_orm_1.sql) `points_cost >= 0`),
    stampsCostNonNegative: (0, pg_core_1.check)('rewards_stamps_cost_nonnegative', (0, drizzle_orm_1.sql) `stamps_cost IS NULL OR stamps_cost >= 0`),
    redemptionsValid: (0, pg_core_1.check)('rewards_redemptions_valid', (0, drizzle_orm_1.sql) `max_redemptions IS NULL OR current_redemptions <= max_redemptions`),
    validDateRange: (0, pg_core_1.check)('rewards_valid_date_range', (0, drizzle_orm_1.sql) `valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until`),
}));
//# sourceMappingURL=index.js.map