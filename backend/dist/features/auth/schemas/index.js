"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifications = exports.sessions = exports.accounts = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)('email_verified').default(false).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    image: (0, pg_core_1.varchar)('image', { length: 255 }),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 20 }).unique(),
    phoneNumberVerified: (0, pg_core_1.boolean)('phone_number_verified').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    emailIdx: (0, pg_core_1.uniqueIndex)('users_email_idx').on(t.email),
}));
exports.accounts = (0, pg_core_1.pgTable)('accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    accountType: (0, pg_core_1.varchar)('account_type', { length: 50 }),
    provider: (0, pg_core_1.varchar)('provider', { length: 100 }).notNull(),
    providerAccountId: (0, pg_core_1.varchar)('provider_account_id', { length: 255 }).notNull(),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    accessToken: (0, pg_core_1.text)('access_token'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    password: (0, pg_core_1.text)('password'),
    idToken: (0, pg_core_1.text)('id_token'),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)('access_token_expires_at'),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)('refresh_token_expires_at'),
    scope: (0, pg_core_1.text)('scope'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: (0, pg_core_1.uniqueIndex)('accounts_user_id_provider_idx').on(t.userId, t.provider),
}));
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: (0, pg_core_1.index)('sessions_user_id_idx').on(t.userId),
    tokenIdx: (0, pg_core_1.uniqueIndex)('sessions_token_idx').on(t.token),
}));
exports.verifications = (0, pg_core_1.pgTable)('verifications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    identifier: (0, pg_core_1.varchar)('identifier', { length: 255 }).notNull(),
    value: (0, pg_core_1.varchar)('value', { length: 255 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    identifierIdx: (0, pg_core_1.uniqueIndex)('verifications_identifier_idx').on(t.identifier),
}));
//# sourceMappingURL=index.js.map