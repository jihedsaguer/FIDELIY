import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../../auth/schemas';

export const merchantAccounts = pgTable(
  'merchant_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessName: varchar('business_name', { length: 255 }),
    emailVerified: boolean('email_verified').default(false).notNull(),
    registeredAt: timestamp('registered_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: uniqueIndex('merchant_accounts_user_id_idx').on(t.userId),
  }),
);

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicQrId: uuid('public_qr_id').notNull().defaultRandom(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchantAccounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    branchCount: integer('branch_count').default(0).notNull(),
    businessPhone: varchar('business_phone', { length: 20 }),
    phonePubliclyDisplayed: boolean('phone_publicly_displayed')
      .default(false)
      .notNull(),
    phoneVisibilityConfigured: boolean('phone_visibility_configured')
      .default(false)
      .notNull(),
    logoUrl: varchar('logo_url', { length: 2048 }),
    logoStorageKey: varchar('logo_storage_key', { length: 255 }),
    logoFilename: varchar('logo_filename', { length: 255 }),
    logoWidth: integer('logo_width'),
    logoHeight: integer('logo_height'),
    logoMimeType: varchar('logo_mime_type', { length: 50 }),
    logoUploadedAt: timestamp('logo_uploaded_at'),
    themePrimaryColor: varchar('theme_primary_color', { length: 7 }),
    themeAccentColor: varchar('theme_accent_color', { length: 7 }),
    onboardingCompleted: boolean('onboarding_completed')
      .default(false)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    merchantIdIdx: uniqueIndex('businesses_merchant_id_idx').on(t.merchantId),
    publicQrIdIdx: uniqueIndex('businesses_public_qr_id_idx').on(t.publicQrId),
    logoStorageKeyIdx: index('businesses_logo_storage_key_idx').on(t.logoStorageKey),
  }),
);

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    qrCodeId: varchar('qr_code_id', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    businessIdIdx: index('branches_business_id_idx').on(t.businessId),
    qrCodeIdIdx: uniqueIndex('branches_qr_code_id_idx').on(t.qrCodeId),
    idBusinessUnique: uniqueIndex('branches_id_business_unique').on(
      t.id,
      t.businessId,
    ),
  }),
);
