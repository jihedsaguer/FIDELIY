import { baseApi } from '../../../services/api/baseApi';

/**
 * Customer loyalty API types
 */

export type LoyaltyProgramType = 'stamps' | 'points' | 'both';

/** One redeemable reward of the active programme (cost in stamps or points). */
export interface MembershipReward {
  name: string;
  activityType: 'stamps' | 'points';
  cost: number;
}

/**
 * Item of GET /customers/memberships and body of GET /customers/memberships/:id
 * (the detail adds `lifecycle`). Matches customer-membership.service.ts.
 */
export interface CustomerMembership {
  id: string;
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt: string | null;
  business: { name: string; logoUrl: string | null };
  program: { type: LoyaltyProgramType; version: number } | null;
  balance: { stamps: number; points: number };
  rewards: MembershipReward[];
}

export interface MembershipDetail extends CustomerMembership {
  lifecycle?: Array<{ type: 'joined' | 'left'; occurredAt: string }>;
}

export interface TransactionHistoryItem {
  id: string;
  occurredAt: string;
  category: 'purchase' | 'manual_adjustment' | 'reversal';
  stampsDelta: number;
  pointsDelta: number;
  stampsBalance: number;
  pointsBalance: number;
  branchName?: string;
  branchId?: string;
}

export interface RewardInfo {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  stampsCost: number | null;
  available: boolean;
}

/**
 * GET /customers/personal-qr: the current credential and short ID (404 when none is issued).
 * `credential` and `shortCode` are null with `requiresRotation: true` for a legacy credential
 * that cannot be displayed; the customer must rotate it once. Keep the values in memory only.
 */
export interface PersonalQrStatus {
  issuedAt: string;
  active: boolean;
  credential: string | null;
  shortCode: string | null;
  requiresRotation?: boolean;
}

/**
 * POST /customers/personal-qr (409 if one is active) and POST /customers/personal-qr/rotate.
 * `shortCode` (XXXXX-XXXXX) is what a merchant types when scanning fails.
 */
export interface PersonalQrIssued {
  credential: string;
  shortCode: string | null;
  issuedAt: string;
}

/**
 * Customer loyalty API endpoints
 * Require CustomerGuard authentication
 */
export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all memberships with balances
     */
    getMembershipsWithBalances: builder.query<CustomerMembership[], void>({
      query: () => '/customers/memberships',
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Get a specific membership by ID
     */
    getMembership: builder.query<MembershipDetail, string>({
      query: (membershipId) => `/customers/memberships/${membershipId}`,
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Get transaction history for a membership
     */
    getTransactionHistory: builder.query<
      TransactionHistoryItem[],
      { membershipId: string; limit?: number; offset?: number }
    >({
      query: ({ membershipId, limit = 50, offset = 0 }) =>
        `/customers/memberships/${membershipId}/transactions?limit=${limit}&offset=${offset}`,
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Get available rewards for a membership
     */
    getAvailableRewards: builder.query<RewardInfo[], string>({
      query: (membershipId) => `/customers/memberships/${membershipId}/rewards`,
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Get the current personal QR credential and short ID
     */
    getPersonalQr: builder.query<PersonalQrStatus, void>({
      query: () => '/customers/personal-qr',
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Issue personal QR credential
     */
    issuePersonalQr: builder.mutation<PersonalQrIssued, void>({
      query: () => ({
        url: '/customers/personal-qr',
        method: 'POST',
      }),
      invalidatesTags: ['CustomerProfile'],
    }),

    /**
     * Rotate personal QR credential
     */
    rotatePersonalQr: builder.mutation<PersonalQrIssued, void>({
      query: () => ({
        url: '/customers/personal-qr/rotate',
        method: 'POST',
      }),
      invalidatesTags: ['CustomerProfile'],
    }),
  }),
});

export const {
  useGetMembershipsWithBalancesQuery,
  useGetMembershipQuery,
  useGetTransactionHistoryQuery,
  useGetAvailableRewardsQuery,
  useGetPersonalQrQuery,
  useIssuePersonalQrMutation,
  useRotatePersonalQrMutation,
} = customerApi;
