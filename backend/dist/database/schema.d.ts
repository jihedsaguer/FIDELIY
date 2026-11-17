export { accounts, sessions, users, verifications, } from '../features/auth/schemas';
export { customerAccounts, customerBusinessMemberships, membershipLifecycleEvents, customerQrCredentials, membershipStatusEnum, membershipEventTypeEnum, } from '../features/customers/schemas';
export { businesses, branches, merchantAccounts } from '../features/merchants/schemas';
export { programs, programConfigurations, rewards, programTypeEnum, programConfigurationTypeEnum, programStatusEnum, } from '../features/programs/schemas';
export { loyaltyTransactions, loyaltyActivityEntries, loyaltyTransactionCategoryEnum, loyaltyActivityTypeEnum, } from '../features/loyalty/schemas';
export declare const usersRelations: import("drizzle-orm").Relations<"users", {
    accounts: import("drizzle-orm").Many<"accounts">;
    sessions: import("drizzle-orm").Many<"sessions">;
    customerAccount: import("drizzle-orm").Many<"customer_accounts">;
    merchantAccount: import("drizzle-orm").Many<"merchant_accounts">;
}>;
export declare const accountsRelations: import("drizzle-orm").Relations<"accounts", {
    user: import("drizzle-orm").One<"users", true>;
}>;
export declare const sessionsRelations: import("drizzle-orm").Relations<"sessions", {
    user: import("drizzle-orm").One<"users", true>;
}>;
export declare const customerAccountsRelations: import("drizzle-orm").Relations<"customer_accounts", {
    user: import("drizzle-orm").One<"users", true>;
    memberships: import("drizzle-orm").Many<"customer_business_memberships">;
    qrCredentials: import("drizzle-orm").Many<"customer_qr_credentials">;
}>;
export declare const merchantAccountsRelations: import("drizzle-orm").Relations<"merchant_accounts", {
    user: import("drizzle-orm").One<"users", true>;
    businesses: import("drizzle-orm").Many<"businesses">;
}>;
export declare const businessesRelations: import("drizzle-orm").Relations<"businesses", {
    merchant: import("drizzle-orm").One<"merchant_accounts", true>;
    branches: import("drizzle-orm").Many<"branches">;
    programs: import("drizzle-orm").Many<"programs">;
    customerMemberships: import("drizzle-orm").Many<"customer_business_memberships">;
}>;
export declare const branchesRelations: import("drizzle-orm").Relations<"branches", {
    business: import("drizzle-orm").One<"businesses", true>;
}>;
export declare const programsRelations: import("drizzle-orm").Relations<"programs", {
    business: import("drizzle-orm").One<"businesses", true>;
    configurations: import("drizzle-orm").Many<"program_configurations">;
}>;
export declare const programConfigurationsRelations: import("drizzle-orm").Relations<"program_configurations", {
    program: import("drizzle-orm").One<"programs", true>;
}>;
export declare const customerBusinessMembershipsRelations: import("drizzle-orm").Relations<"customer_business_memberships", {
    customerAccount: import("drizzle-orm").One<"customer_accounts", true>;
    business: import("drizzle-orm").One<"businesses", true>;
    lifecycleEvents: import("drizzle-orm").Many<"membership_lifecycle_events">;
}>;
export declare const membershipLifecycleEventsRelations: import("drizzle-orm").Relations<"membership_lifecycle_events", {
    membership: import("drizzle-orm").One<"customer_business_memberships", true>;
}>;
export declare const customerQrCredentialsRelations: import("drizzle-orm").Relations<"customer_qr_credentials", {
    customerAccount: import("drizzle-orm").One<"customer_accounts", true>;
}>;
export declare const loyaltyTransactionsRelations: import("drizzle-orm").Relations<"loyalty_transactions", {
    business: import("drizzle-orm").One<"businesses", true>;
    membership: import("drizzle-orm").One<"customer_business_memberships", true>;
    branch: import("drizzle-orm").One<"branches", false>;
    merchantAccount: import("drizzle-orm").One<"merchant_accounts", true>;
    entries: import("drizzle-orm").Many<"loyalty_activity_entries">;
}>;
export declare const loyaltyActivityEntriesRelations: import("drizzle-orm").Relations<"loyalty_activity_entries", {
    transaction: import("drizzle-orm").One<"loyalty_transactions", true>;
    configuration: import("drizzle-orm").One<"program_configurations", true>;
}>;
//# sourceMappingURL=schema.d.ts.map