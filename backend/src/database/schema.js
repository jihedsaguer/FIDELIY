import { pgTable, uuid, varchar, text, timestamp, boolean, integer, uniqueIndex, } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
/**
 * FIDELIY Database Schema
 *
 * Phase 1A: Milestone 1 - Database Foundation
 * Implements Better Auth canonical tables + core domain entities
 *
 * Multi-Tenancy Strategy:
 * - Global user identity via Better Auth users table
 * - Capability tables (customer_accounts, merchant_accounts) link users to roles
 * - Tenant isolation via PostgreSQL RLS (transaction-scoped app.user_id context)
 * - One user can have BOTH customer and merchant capabilities
 *
 * Note: RLS policies are defined separately in rls.sql
 */
// ============================================================================
// BETTER AUTH CANONICAL TABLES
// ============================================================================
/**
 * users — Global user identity managed by Better Auth
 * Canonical record for all authentication providers (phone, email, oauth)
 */
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: boolean('email_verified').default(false),
    name: varchar('name', { length: 255 }),
    image: varchar('image', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
}));
/**
 * accounts — Better Auth account linking
 * Links users to authentication providers (phone-number, email-password, oauth)
 * Single user can have multiple accounts (e.g., phone + email)
 */
export const accounts = pgTable('accounts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    accountType: varchar('account_type', { length: 50 }).notNull(), // 'phone-number', 'email-password', 'oauth'
    provider: varchar('provider', { length: 100 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: uniqueIndex('accounts_user_id_provider_idx').on(t.userId, t.provider),
}));
/**
 * sessions — Better Auth session management
 * Token-based sessions with expiration
 */
export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: uniqueIndex('sessions_user_id_idx').on(t.userId),
    tokenIdx: uniqueIndex('sessions_token_idx').on(t.token),
}));
/**
 * verifications — Better Auth email/phone verification
 * OTP and verification token storage
 */
export const verifications = pgTable('verifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: varchar('identifier', { length: 255 }).notNull(), // email or phone
    value: varchar('value', { length: 255 }).notNull(), // OTP or token
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    identifierIdx: uniqueIndex('verifications_identifier_idx').on(t.identifier),
}));
// ============================================================================
// CAPABILITY TABLES - DOMAIN: CUSTOMERS & MERCHANTS
// ============================================================================
/**
 * customer_accounts — Customer-specific capability record
 * Links a user to their customer role within FIDELIY
 * One customer account per user (UNIQUE constraint)
 *
 * RLS: Customer can only SELECT their own record
 * Derived from: authenticated user.id
 */
export const customerAccounts = pgTable('customer_accounts', {
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
}, (t) => ({
    userIdIdx: uniqueIndex('customer_accounts_user_id_idx').on(t.userId),
}));
/**
 * merchant_accounts — Merchant-specific capability record
 * Links a user to their merchant role within FIDELIY
 * One merchant account per user (UNIQUE constraint)
 *
 * RLS: Merchant can only SELECT their own record
 * Derived from: authenticated user.id
 */
export const merchantAccounts = pgTable('merchant_accounts', {
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
}, (t) => ({
    userIdIdx: uniqueIndex('merchant_accounts_user_id_idx').on(t.userId),
}));
// ============================================================================
// DOMAIN: BUSINESSES & BRANCHES - Merchant Ownership & Tenant Isolation
// ============================================================================
/**
 * businesses — Physical or logical business entities owned by a merchant
 * Multiple businesses can be owned by a single merchant
 *
 * RLS: Merchant can only SELECT businesses where businessId's merchant is the authenticated user
 * Derived from: merchantId → merchant_accounts.user_id
 */
export const businesses = pgTable('businesses', {
    id: uuid('id').primaryKey().defaultRandom(),
    merchantId: uuid('merchant_id')
        .notNull()
        .references(() => merchantAccounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    branchCount: integer('branch_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    merchantIdIdx: uniqueIndex('businesses_merchant_id_idx').on(t.merchantId),
}));
/**
 * branches — Individual physical locations of a business
 * Each branch has a unique QR code for customer scanning
 *
 * RLS: Merchant can only SELECT branches of their businesses
 * Derived from: businessId → businesses.merchantId → merchant_accounts.user_id
 */
export const branches = pgTable('branches', {
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
}, (t) => ({
    businessIdIdx: uniqueIndex('branches_business_id_idx').on(t.businessId),
    qrCodeIdIdx: uniqueIndex('branches_qr_code_id_idx').on(t.qrCodeId),
}));
// ============================================================================
// RELATIONSHIPS (Drizzle ORM relations for lazy loading)
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    sessions: many(sessions),
    customerAccount: many(customerAccounts),
    merchantAccount: many(merchantAccounts),
}));
export const customerAccountsRelations = relations(customerAccounts, ({ one }) => ({
    user: one(users, {
        fields: [customerAccounts.userId],
        references: [users.id],
    }),
}));
export const merchantAccountsRelations = relations(merchantAccounts, ({ one, many }) => ({
    user: one(users, {
        fields: [merchantAccounts.userId],
        references: [users.id],
    }),
    businesses: many(businesses),
}));
export const businessesRelations = relations(businesses, ({ one, many }) => ({
    merchant: one(merchantAccounts, {
        fields: [businesses.merchantId],
        references: [merchantAccounts.id],
    }),
    branches: many(branches),
}));
export const branchesRelations = relations(branches, ({ one }) => ({
    business: one(businesses, {
        fields: [branches.businessId],
        references: [businesses.id],
    }),
}));
export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));
