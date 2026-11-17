"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyActivityEntriesRelations = exports.loyaltyTransactionsRelations = exports.customerQrCredentialsRelations = exports.membershipLifecycleEventsRelations = exports.customerBusinessMembershipsRelations = exports.programConfigurationsRelations = exports.programsRelations = exports.branchesRelations = exports.businessesRelations = exports.merchantAccountsRelations = exports.customerAccountsRelations = exports.sessionsRelations = exports.accountsRelations = exports.usersRelations = exports.loyaltyActivityTypeEnum = exports.loyaltyTransactionCategoryEnum = exports.loyaltyActivityEntries = exports.loyaltyTransactions = exports.programStatusEnum = exports.programConfigurationTypeEnum = exports.programTypeEnum = exports.rewards = exports.programConfigurations = exports.programs = exports.merchantAccounts = exports.branches = exports.businesses = exports.membershipEventTypeEnum = exports.membershipStatusEnum = exports.customerQrCredentials = exports.membershipLifecycleEvents = exports.customerBusinessMemberships = exports.customerAccounts = exports.verifications = exports.users = exports.sessions = exports.accounts = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schemas_1 = require("../features/auth/schemas");
const schemas_2 = require("../features/customers/schemas");
const schemas_3 = require("../features/merchants/schemas");
const schemas_4 = require("../features/programs/schemas");
const schemas_5 = require("../features/loyalty/schemas");
var schemas_6 = require("../features/auth/schemas");
Object.defineProperty(exports, "accounts", { enumerable: true, get: function () { return schemas_6.accounts; } });
Object.defineProperty(exports, "sessions", { enumerable: true, get: function () { return schemas_6.sessions; } });
Object.defineProperty(exports, "users", { enumerable: true, get: function () { return schemas_6.users; } });
Object.defineProperty(exports, "verifications", { enumerable: true, get: function () { return schemas_6.verifications; } });
var schemas_7 = require("../features/customers/schemas");
Object.defineProperty(exports, "customerAccounts", { enumerable: true, get: function () { return schemas_7.customerAccounts; } });
Object.defineProperty(exports, "customerBusinessMemberships", { enumerable: true, get: function () { return schemas_7.customerBusinessMemberships; } });
Object.defineProperty(exports, "membershipLifecycleEvents", { enumerable: true, get: function () { return schemas_7.membershipLifecycleEvents; } });
Object.defineProperty(exports, "customerQrCredentials", { enumerable: true, get: function () { return schemas_7.customerQrCredentials; } });
Object.defineProperty(exports, "membershipStatusEnum", { enumerable: true, get: function () { return schemas_7.membershipStatusEnum; } });
Object.defineProperty(exports, "membershipEventTypeEnum", { enumerable: true, get: function () { return schemas_7.membershipEventTypeEnum; } });
var schemas_8 = require("../features/merchants/schemas");
Object.defineProperty(exports, "businesses", { enumerable: true, get: function () { return schemas_8.businesses; } });
Object.defineProperty(exports, "branches", { enumerable: true, get: function () { return schemas_8.branches; } });
Object.defineProperty(exports, "merchantAccounts", { enumerable: true, get: function () { return schemas_8.merchantAccounts; } });
var schemas_9 = require("../features/programs/schemas");
Object.defineProperty(exports, "programs", { enumerable: true, get: function () { return schemas_9.programs; } });
Object.defineProperty(exports, "programConfigurations", { enumerable: true, get: function () { return schemas_9.programConfigurations; } });
Object.defineProperty(exports, "rewards", { enumerable: true, get: function () { return schemas_9.rewards; } });
Object.defineProperty(exports, "programTypeEnum", { enumerable: true, get: function () { return schemas_9.programTypeEnum; } });
Object.defineProperty(exports, "programConfigurationTypeEnum", { enumerable: true, get: function () { return schemas_9.programConfigurationTypeEnum; } });
Object.defineProperty(exports, "programStatusEnum", { enumerable: true, get: function () { return schemas_9.programStatusEnum; } });
var schemas_10 = require("../features/loyalty/schemas");
Object.defineProperty(exports, "loyaltyTransactions", { enumerable: true, get: function () { return schemas_10.loyaltyTransactions; } });
Object.defineProperty(exports, "loyaltyActivityEntries", { enumerable: true, get: function () { return schemas_10.loyaltyActivityEntries; } });
Object.defineProperty(exports, "loyaltyTransactionCategoryEnum", { enumerable: true, get: function () { return schemas_10.loyaltyTransactionCategoryEnum; } });
Object.defineProperty(exports, "loyaltyActivityTypeEnum", { enumerable: true, get: function () { return schemas_10.loyaltyActivityTypeEnum; } });
exports.usersRelations = (0, drizzle_orm_1.relations)(schemas_1.users, ({ many }) => ({
    accounts: many(schemas_1.accounts),
    sessions: many(schemas_1.sessions),
    customerAccount: many(schemas_2.customerAccounts),
    merchantAccount: many(schemas_3.merchantAccounts),
}));
exports.accountsRelations = (0, drizzle_orm_1.relations)(schemas_1.accounts, ({ one }) => ({
    user: one(schemas_1.users, {
        fields: [schemas_1.accounts.userId],
        references: [schemas_1.users.id],
    }),
}));
exports.sessionsRelations = (0, drizzle_orm_1.relations)(schemas_1.sessions, ({ one }) => ({
    user: one(schemas_1.users, {
        fields: [schemas_1.sessions.userId],
        references: [schemas_1.users.id],
    }),
}));
exports.customerAccountsRelations = (0, drizzle_orm_1.relations)(schemas_2.customerAccounts, ({ one, many }) => ({
    user: one(schemas_1.users, {
        fields: [schemas_2.customerAccounts.userId],
        references: [schemas_1.users.id],
    }),
    memberships: many(schemas_2.customerBusinessMemberships),
    qrCredentials: many(schemas_2.customerQrCredentials),
}));
exports.merchantAccountsRelations = (0, drizzle_orm_1.relations)(schemas_3.merchantAccounts, ({ one, many }) => ({
    user: one(schemas_1.users, {
        fields: [schemas_3.merchantAccounts.userId],
        references: [schemas_1.users.id],
    }),
    businesses: many(schemas_3.businesses),
}));
exports.businessesRelations = (0, drizzle_orm_1.relations)(schemas_3.businesses, ({ one, many }) => ({
    merchant: one(schemas_3.merchantAccounts, {
        fields: [schemas_3.businesses.merchantId],
        references: [schemas_3.merchantAccounts.id],
    }),
    branches: many(schemas_3.branches),
    programs: many(schemas_4.programs),
    customerMemberships: many(schemas_2.customerBusinessMemberships),
}));
exports.branchesRelations = (0, drizzle_orm_1.relations)(schemas_3.branches, ({ one }) => ({
    business: one(schemas_3.businesses, {
        fields: [schemas_3.branches.businessId],
        references: [schemas_3.businesses.id],
    }),
}));
exports.programsRelations = (0, drizzle_orm_1.relations)(schemas_4.programs, ({ one, many }) => ({
    business: one(schemas_3.businesses, {
        fields: [schemas_4.programs.businessId],
        references: [schemas_3.businesses.id],
    }),
    configurations: many(schemas_4.programConfigurations),
}));
exports.programConfigurationsRelations = (0, drizzle_orm_1.relations)(schemas_4.programConfigurations, ({ one }) => ({
    program: one(schemas_4.programs, {
        fields: [schemas_4.programConfigurations.programId],
        references: [schemas_4.programs.id],
    }),
}));
exports.customerBusinessMembershipsRelations = (0, drizzle_orm_1.relations)(schemas_2.customerBusinessMemberships, ({ one, many }) => ({
    customerAccount: one(schemas_2.customerAccounts, {
        fields: [schemas_2.customerBusinessMemberships.customerAccountId],
        references: [schemas_2.customerAccounts.id],
    }),
    business: one(schemas_3.businesses, {
        fields: [schemas_2.customerBusinessMemberships.businessId],
        references: [schemas_3.businesses.id],
    }),
    lifecycleEvents: many(schemas_2.membershipLifecycleEvents),
}));
exports.membershipLifecycleEventsRelations = (0, drizzle_orm_1.relations)(schemas_2.membershipLifecycleEvents, ({ one }) => ({
    membership: one(schemas_2.customerBusinessMemberships, {
        fields: [schemas_2.membershipLifecycleEvents.membershipId],
        references: [schemas_2.customerBusinessMemberships.id],
    }),
}));
exports.customerQrCredentialsRelations = (0, drizzle_orm_1.relations)(schemas_2.customerQrCredentials, ({ one }) => ({
    customerAccount: one(schemas_2.customerAccounts, {
        fields: [schemas_2.customerQrCredentials.customerAccountId],
        references: [schemas_2.customerAccounts.id],
    }),
}));
exports.loyaltyTransactionsRelations = (0, drizzle_orm_1.relations)(schemas_5.loyaltyTransactions, ({ one, many }) => ({
    business: one(schemas_3.businesses, {
        fields: [schemas_5.loyaltyTransactions.businessId],
        references: [schemas_3.businesses.id],
    }),
    membership: one(schemas_2.customerBusinessMemberships, {
        fields: [schemas_5.loyaltyTransactions.membershipId],
        references: [schemas_2.customerBusinessMemberships.id],
    }),
    branch: one(schemas_3.branches, {
        fields: [schemas_5.loyaltyTransactions.branchId],
        references: [schemas_3.branches.id],
    }),
    merchantAccount: one(schemas_3.merchantAccounts, {
        fields: [schemas_5.loyaltyTransactions.merchantAccountId],
        references: [schemas_3.merchantAccounts.id],
    }),
    entries: many(schemas_5.loyaltyActivityEntries),
}));
exports.loyaltyActivityEntriesRelations = (0, drizzle_orm_1.relations)(schemas_5.loyaltyActivityEntries, ({ one }) => ({
    transaction: one(schemas_5.loyaltyTransactions, {
        fields: [schemas_5.loyaltyActivityEntries.transactionId],
        references: [schemas_5.loyaltyTransactions.id],
    }),
    configuration: one(schemas_4.programConfigurations, {
        fields: [schemas_5.loyaltyActivityEntries.programConfigurationId],
        references: [schemas_4.programConfigurations.id],
    }),
}));
//# sourceMappingURL=schema.js.map