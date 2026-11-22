import { baseApi } from '../../../services/api/baseApi';

/**
 * Merchant transaction API (checkpoint 6B-C contract, ARCHITECTURE.md 6.5).
 * Mirrors backend/src/features/merchants/dto/merchant-transaction.dto.ts.
 * Amounts are TND decimal strings with at most 3 decimals (e.g. "12.500").
 */

/** `code` of the 409 returned when a purchase was recorded in the last 10 minutes. */
export const RECENT_EARNING_CONFIRMATION_REQUIRED = 'RECENT_EARNING_CONFIRMATION_REQUIRED';

export type LoyaltyActivityType = 'stamps' | 'points';
export type LoyaltyTransactionCategory = 'purchase' | 'redemption' | 'reversal' | 'manual_adjustment';

export interface Balance {
  stamps: number;
  points: number;
}

export interface CustomerForTransaction {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface MembershipForTransaction {
  id: string;
  status: 'active' | 'inactive';
  joinedAt: string;
  enrolment: 'existing' | 'joined' | 'rejoined';
}

export interface ProgramForTransaction {
  id: string;
  type: 'stamps' | 'points' | 'both';
  version: number;
  name: string | null;
  configurations: {
    stamps?: { configurationId: string };
    points?: { configurationId: string; earningRate: string | null };
  };
}

export interface RewardOption {
  configurationId: string;
  rewardIndex: number;
  name: string;
  activityType: LoyaltyActivityType;
  cost: number;
  available: boolean;
}

export interface CustomerForTransactionResponse {
  customer: CustomerForTransaction;
  membership: MembershipForTransaction;
  balance: Balance;
  program: ProgramForTransaction;
  rewards: RewardOption[];
}

export interface ResolveCustomerForTransactionDto {
  qrCredential: string;
  branchId?: string;
}

export interface CalculateEarningsDto {
  membershipId: string;
  /** Required for programmes that include points; optional for stamps-only. */
  purchaseAmount?: string;
}

export interface CalculateEarningsResponse {
  purchaseAmount: string | null;
  stampsToEarn: number;
  pointsToEarn: number;
  earningRate: string | null;
  totalStampsAfter: number;
  totalPointsAfter: number;
}

export interface CreateLoyaltyTransactionDto {
  membershipId: string;
  purchaseAmount?: string;
  /** Required when the business has more than one branch. */
  branchId?: string;
  idempotencyKey: string;
  /** Explicit confirmation after RECENT_EARNING_CONFIRMATION_REQUIRED. */
  confirmRepeat?: boolean;
}

export interface CreateLoyaltyTransactionResponse {
  transactionId: string;
  membershipId: string;
  purchaseAmount: string | null;
  stampsEarned: number;
  pointsEarned: number;
  earningRate: string | null;
  newBalance: Balance;
  occurredAt: string;
  idempotencyKey: string;
}

export interface RedeemRewardDto {
  membershipId: string;
  configurationId: string;
  rewardIndex: number;
  branchId?: string;
  idempotencyKey: string;
}

export interface RedeemRewardResponse {
  transactionId: string;
  membershipId: string;
  reward: Omit<RewardOption, 'available'>;
  newBalance: Balance;
  occurredAt: string;
  idempotencyKey: string;
}

export interface ReverseTransactionDto {
  transactionId: string;
  reason: string;
  idempotencyKey: string;
}

export interface ReverseTransactionResponse {
  transactionId: string;
  reversesTransactionId: string;
  membershipId: string;
  reason: string;
  stampsDelta: number;
  pointsDelta: number;
  newBalance: Balance;
  occurredAt: string;
  idempotencyKey: string;
}

export interface TransactionHistoryEntry {
  activityType: LoyaltyActivityType;
  delta: number;
  programConfigurationId: string;
  earningRate: string | null;
}

export interface MerchantTransactionHistoryItem {
  id: string;
  membershipId: string;
  branchId: string | null;
  category: LoyaltyTransactionCategory;
  occurredAt: string;
  purchaseAmount: string | null;
  reversalReason: string | null;
  reversesTransactionId: string | null;
  reversedByTransactionId: string | null;
  stampsDelta: number;
  pointsDelta: number;
  entries: TransactionHistoryEntry[];
}

/** Totals for one currency over the whole membership ledger (server-computed). */
export interface CurrencyTotals {
  earned: number;
  earningsReversed: number;
  redeemed: number;
  redemptionsReversed: number;
  adjustments: number;
  balance: number;
}

/** Present only when the request filters by membershipId. */
export interface MerchantTransactionHistorySummary {
  stamps: CurrencyTotals;
  points: CurrencyTotals;
  transactionCount: number;
  programType: 'stamps' | 'points' | 'both' | null;
  rewards: Array<Omit<RewardOption, 'available'>>;
}

export interface MerchantTransactionHistoryResponse {
  transactions: MerchantTransactionHistoryItem[];
  summary?: MerchantTransactionHistorySummary;
}

/**
 * Merchant transaction API endpoints (MerchantGuard).
 */
export const merchantTransactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    resolveCustomerForTransaction: builder.mutation<
      CustomerForTransactionResponse,
      ResolveCustomerForTransactionDto
    >({
      query: (body) => ({
        url: '/merchants/customers/resolve-for-transaction',
        method: 'POST',
        body,
      }),
      // Never 'Session': a session refetch makes ProtectedRoute unmount the whole workspace
      // (including the open scanner and its result). A scan can enrol a customer, so only the list is stale.
      invalidatesTags: ['MerchantCustomers'],
    }),

    /** Preview only; nothing is written. */
    calculateEarnings: builder.mutation<CalculateEarningsResponse, CalculateEarningsDto>({
      query: (body) => ({
        url: '/merchants/transactions/calculate-earnings',
        method: 'POST',
        body,
      }),
    }),

    createLoyaltyTransaction: builder.mutation<
      CreateLoyaltyTransactionResponse,
      CreateLoyaltyTransactionDto
    >({
      query: (body) => ({
        url: '/merchants/transactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program', 'Transaction', 'MerchantCustomers'],
    }),

    redeemReward: builder.mutation<RedeemRewardResponse, RedeemRewardDto>({
      query: (body) => ({
        url: '/merchants/transactions/redeem-reward',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program', 'Transaction', 'MerchantCustomers'],
    }),

    reverseTransaction: builder.mutation<ReverseTransactionResponse, ReverseTransactionDto>({
      query: ({ transactionId, reason, idempotencyKey }) => ({
        url: `/merchants/transactions/${encodeURIComponent(transactionId)}/reverse`,
        method: 'POST',
        body: { reason, idempotencyKey },
      }),
      invalidatesTags: ['Transaction', 'MerchantCustomers'],
    }),

    listTransactions: builder.query<MerchantTransactionHistoryResponse, { membershipId: string }>({
      query: ({ membershipId }) => ({
        url: '/merchants/transactions',
        method: 'GET',
        params: { membershipId },
      }),
      providesTags: ['Transaction'],
    }),
  }),
});

export const {
  useResolveCustomerForTransactionMutation,
  useCalculateEarningsMutation,
  useCreateLoyaltyTransactionMutation,
  useRedeemRewardMutation,
  useReverseTransactionMutation,
  useListTransactionsQuery,
} = merchantTransactionApi;
