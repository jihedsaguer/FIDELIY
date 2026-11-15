import { relations } from 'drizzle-orm';
import { accounts, sessions, users } from '../features/auth/schemas';
import {
  customerAccounts,
  customerBusinessMemberships,
  membershipLifecycleEvents,
  customerQrCredentials,
} from '../features/customers/schemas';
import { businesses, branches, merchantAccounts } from '../features/merchants/schemas';
import {
  programs,
  programConfigurations,
} from '../features/programs/schemas';
import {
  loyaltyActivityEntries,
  loyaltyActivityTypeEnum,
  loyaltyTransactionCategoryEnum,
  loyaltyTransactions,
} from '../features/loyalty/schemas';

export {
  accounts,
  sessions,
  users,
  verifications,
} from '../features/auth/schemas';

export {
  customerAccounts,
  customerBusinessMemberships,
  membershipLifecycleEvents,
  customerQrCredentials,
  membershipStatusEnum,
  membershipEventTypeEnum,
} from '../features/customers/schemas';
export { businesses, branches, merchantAccounts } from '../features/merchants/schemas';
export {
  programs,
  programConfigurations,
  programTypeEnum,
  programConfigurationTypeEnum,
  programStatusEnum,
} from '../features/programs/schemas';
export {
  loyaltyTransactions,
  loyaltyActivityEntries,
  loyaltyTransactionCategoryEnum,
  loyaltyActivityTypeEnum,
} from '../features/loyalty/schemas';

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  customerAccount: many(customerAccounts),
  merchantAccount: many(merchantAccounts),
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

export const customerAccountsRelations = relations(customerAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [customerAccounts.userId],
    references: [users.id],
  }),
  memberships: many(customerBusinessMemberships),
  qrCredentials: many(customerQrCredentials),
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
  programs: many(programs),
  customerMemberships: many(customerBusinessMemberships),
}));

export const branchesRelations = relations(branches, ({ one }) => ({
  business: one(businesses, {
    fields: [branches.businessId],
    references: [businesses.id],
  }),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  business: one(businesses, {
    fields: [programs.businessId],
    references: [businesses.id],
  }),
  configurations: many(programConfigurations),
}));

export const programConfigurationsRelations = relations(
  programConfigurations,
  ({ one }) => ({
    program: one(programs, {
      fields: [programConfigurations.programId],
      references: [programs.id],
    }),
  }),
);

export const customerBusinessMembershipsRelations = relations(
  customerBusinessMemberships,
  ({ one, many }) => ({
    customerAccount: one(customerAccounts, {
      fields: [customerBusinessMemberships.customerAccountId],
      references: [customerAccounts.id],
    }),
    business: one(businesses, {
      fields: [customerBusinessMemberships.businessId],
      references: [businesses.id],
    }),
    lifecycleEvents: many(membershipLifecycleEvents),
  }),
);

export const membershipLifecycleEventsRelations = relations(
  membershipLifecycleEvents,
  ({ one }) => ({
    membership: one(customerBusinessMemberships, {
      fields: [membershipLifecycleEvents.membershipId],
      references: [customerBusinessMemberships.id],
    }),
  }),
);

export const customerQrCredentialsRelations = relations(
  customerQrCredentials,
  ({ one }) => ({
    customerAccount: one(customerAccounts, {
      fields: [customerQrCredentials.customerAccountId],
      references: [customerAccounts.id],
    }),
  }),
);

export const loyaltyTransactionsRelations = relations(
  loyaltyTransactions,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [loyaltyTransactions.businessId],
      references: [businesses.id],
    }),
    membership: one(customerBusinessMemberships, {
      fields: [loyaltyTransactions.membershipId],
      references: [customerBusinessMemberships.id],
    }),
    branch: one(branches, {
      fields: [loyaltyTransactions.branchId],
      references: [branches.id],
    }),
    merchantAccount: one(merchantAccounts, {
      fields: [loyaltyTransactions.merchantAccountId],
      references: [merchantAccounts.id],
    }),
    entries: many(loyaltyActivityEntries),
  }),
);

export const loyaltyActivityEntriesRelations = relations(
  loyaltyActivityEntries,
  ({ one }) => ({
    transaction: one(loyaltyTransactions, {
      fields: [loyaltyActivityEntries.transactionId],
      references: [loyaltyTransactions.id],
    }),
    configuration: one(programConfigurations, {
      fields: [loyaltyActivityEntries.programConfigurationId],
      references: [programConfigurations.id],
    }),
  }),
);
