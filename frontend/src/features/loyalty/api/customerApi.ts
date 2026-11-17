import { baseApi } from '../../../services/api/baseApi';

/**
 * Customer loyalty API types
 */

export interface CustomerMembership {
  id: string;
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  status: 'active' | 'inactive';
  joinedAt: string;
  balance: {
    stamps: number;
    points: number;
  };
  programType: 'stamps' | 'points' | 'both' | null;
}

export interface MembershipDetail extends CustomerMembership {
  // Additional detail fields can be added here
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

export interface PersonalQrCredential {
  credential?: string;
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
     * Get personal QR credential
     */
    getPersonalQr: builder.query<PersonalQrCredential, void>({
      query: () => '/customers/personal-qr',
      providesTags: ['CustomerProfile'],
    }),

    /**
     * Issue personal QR credential
     */
    issuePersonalQr: builder.mutation<PersonalQrCredential, void>({
      query: () => ({
        url: '/customers/personal-qr',
        method: 'POST',
      }),
      invalidatesTags: ['CustomerProfile'],
    }),

    /**
     * Rotate personal QR credential
     */
    rotatePersonalQr: builder.mutation<PersonalQrCredential, void>({
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
