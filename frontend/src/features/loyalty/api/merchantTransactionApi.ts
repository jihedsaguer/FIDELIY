import { baseApi } from '../../../services/api/baseApi';

/**
 * Merchant transaction API types
 */

export interface CustomerForTransaction {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface MembershipForTransaction {
  id: string;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export interface Balance {
  stamps: number;
  points: number;
}

export interface ProgramForTransaction {
  id: string;
  type: 'stamps' | 'points' | 'both';
  version: number;
  name: string;
  configuration: {
    stamps?: {
      stampsPerPurchase: number;
      maxStampsPerTransaction: number;
    };
    points?: {
      pointsPerCurrencyUnit: number;
      currencyUnit: string;
      maxPointsPerTransaction: number;
    };
  };
}

export interface RewardForTransaction {
  id: string;
  name: string;
  pointsCost: number;
  stampsCost: number | null;
  available: boolean;
}

export interface CustomerForTransactionResponse {
  customer: CustomerForTransaction;
  membership: MembershipForTransaction;
  balance: Balance;
  program: ProgramForTransaction;
  eligibleRewards: RewardForTransaction[];
}

export interface ResolveCustomerForTransactionDto {
  qrCredential: string;
  branchId?: string;
}

export interface CalculateEarningsDto {
  membershipId: string;
  purchaseAmount: number;
  branchId?: string;
}

export interface EarningsCalculation {
  stamps?: {
    stampsPerPurchase: number;
    transactionsCount: number;
  };
  points?: {
    pointsPerCurrencyUnit: number;
    calculation: string;
  };
}

export interface CalculateEarningsResponse {
  purchaseAmount: number;
  stampsToEarn: number;
  pointsToEarn: number;
  totalStampsAfter: number;
  totalPointsAfter: number;
  calculation: EarningsCalculation;
}

export interface CreateLoyaltyTransactionDto {
  membershipId: string;
  purchaseAmount: number;
  stampsEarned?: number;
  pointsEarned?: number;
  branchId?: string;
  idempotencyKey?: string;
}

export interface CreateLoyaltyTransactionResponse {
  transactionId: string;
  membershipId: string;
  purchaseAmount: number;
  stampsEarned: number;
  pointsEarned: number;
  newBalance: Balance;
  occurredAt: string;
  idempotencyKey: string;
}

export interface RedeemRewardDto {
  membershipId: string;
  rewardId: string;
  branchId?: string;
  idempotencyKey?: string;
}

export interface RewardInfo {
  id: string;
  name: string;
  pointsCost: number;
  stampsCost: number | null;
}

export interface RedeemRewardResponse {
  redemptionId: string;
  reward: RewardInfo;
  customerBalanceBefore: Balance;
  customerBalanceAfter: Balance;
  occurredAt: string;
}

/**
 * Merchant transaction API endpoints
 * Require MerchantGuard authentication
 */
export const merchantTransactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Resolve a customer QR credential for a loyalty transaction
     * Returns customer info, balance, programme details, and eligible rewards
     */
    resolveCustomerForTransaction: builder.mutation<
      CustomerForTransactionResponse,
      ResolveCustomerForTransactionDto
    >({
      query: (body) => ({
        url: '/merchants/customers/resolve-for-transaction',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),

    /**
     * Calculate loyalty earnings for a purchase amount
     * Returns the stamps and points that would be earned
     */
    calculateEarnings: builder.mutation<
      CalculateEarningsResponse,
      CalculateEarningsDto
    >({
      query: (body) => ({
        url: '/merchants/transactions/calculate-earnings',
        method: 'POST',
        body,
      }),
    }),

    /**
     * Create a loyalty transaction for a customer
     * Records stamps and/or points earned from a purchase
     */
    createLoyaltyTransaction: builder.mutation<
      CreateLoyaltyTransactionResponse,
      CreateLoyaltyTransactionDto
    >({
      query: (body) => ({
        url: '/merchants/transactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Redeem a reward for a customer
     * Deducts the reward cost from the customer's balance
     * Note: Requires rewards table to be configured in backend
     */
    redeemReward: builder.mutation<
      RedeemRewardResponse,
      RedeemRewardDto
    >({
      query: (body) => ({
        url: '/merchants/transactions/redeem-reward',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program'],
    }),
  }),
});

export const {
  useResolveCustomerForTransactionMutation,
  useCalculateEarningsMutation,
  useCreateLoyaltyTransactionMutation,
  useRedeemRewardMutation,
} = merchantTransactionApi;
