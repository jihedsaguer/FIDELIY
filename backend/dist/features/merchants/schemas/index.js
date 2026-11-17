"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branches = exports.businesses = exports.merchantAccounts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schemas_1 = require("../../auth/schemas");
exports.merchantAccounts = (0, pg_core_1.pgTable)('merchant_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .unique()
        .references(() => schemas_1.users.id, { onDelete: 'cascade' }),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }),
    emailVerified: (0, pg_core_1.boolean)('email_verified').default(false).notNull(),
    registeredAt: (0, pg_core_1.timestamp)('registered_at').defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: (0, pg_core_1.uniqueIndex)('merchant_accounts_user_id_idx').on(t.userId),
}));
exports.businesses = (0, pg_core_1.pgTable)('businesses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    publicQrId: (0, pg_core_1.uuid)('public_qr_id').notNull().defaultRandom(),
    merchantId: (0, pg_core_1.uuid)('merchant_id')
        .notNull()
        .references(() => exports.merchantAccounts.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    branchCount: (0, pg_core_1.integer)('branch_count').default(0).notNull(),
    businessPhone: (0, pg_core_1.varchar)('business_phone', { length: 20 }),
    phonePubliclyDisplayed: (0, pg_core_1.boolean)('phone_publicly_displayed')
        .default(false)
        .notNull(),
    phoneVisibilityConfigured: (0, pg_core_1.boolean)('phone_visibility_configured')
        .default(false)
        .notNull(),
    logoUrl: (0, pg_core_1.varchar)('logo_url', { length: 2048 }),
    logoStorageKey: (0, pg_core_1.varchar)('logo_storage_key', { length: 255 }),
    logoFilename: (0, pg_core_1.varchar)('logo_filename', { length: 255 }),
    logoWidth: (0, pg_core_1.integer)('logo_width'),
    logoHeight: (0, pg_core_1.integer)('logo_height'),
    logoMimeType: (0, pg_core_1.varchar)('logo_mime_type', { length: 50 }),
    logoUploadedAt: (0, pg_core_1.timestamp)('logo_uploaded_at'),
    themePrimaryColor: (0, pg_core_1.varchar)('theme_primary_color', { length: 7 }),
    themeAccentColor: (0, pg_core_1.varchar)('theme_accent_color', { length: 7 }),
    onboardingCompleted: (0, pg_core_1.boolean)('onboarding_completed')
        .default(false)
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    merchantIdIdx: (0, pg_core_1.uniqueIndex)('businesses_merchant_id_idx').on(t.merchantId),
    publicQrIdIdx: (0, pg_core_1.uniqueIndex)('businesses_public_qr_id_idx').on(t.publicQrId),
    logoStorageKeyIdx: (0, pg_core_1.index)('businesses_logo_storage_key_idx').on(t.logoStorageKey),
}));
exports.branches = (0, pg_core_1.pgTable)('branches', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    businessId: (0, pg_core_1.uuid)('business_id')
        .notNull()
        .references(() => exports.businesses.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    address: (0, pg_core_1.varchar)('address', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    qrCodeId: (0, pg_core_1.varchar)('qr_code_id', { length: 255 }).notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    businessIdIdx: (0, pg_core_1.index)('branches_business_id_idx').on(t.businessId),
    qrCodeIdIdx: (0, pg_core_1.uniqueIndex)('branches_qr_code_id_idx').on(t.qrCodeId),
    idBusinessUnique: (0, pg_core_1.uniqueIndex)('branches_id_business_unique').on(t.id, t.businessId),
}));
//# sourceMappingURL=index.js.map