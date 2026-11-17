import { baseApi } from '../../../services/api/baseApi';

/**
 * Public QR and onboarding API types
 */

export interface PublicBusiness {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  theme: {
    primaryColor: string | null;
    accentColor: string | null;
  };
  branchCount: number;
}

export interface PublicProgram {
  type: 'stamps' | 'points' | 'both';
  version: number;
  name?: string;
  description?: string;
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface PublicBusinessDiscoveryResponse {
  business: PublicBusiness;
  program: PublicProgram | null;
  branch?: PublicBranch;
}

export interface PublicCustomerLookupDto {
  phoneNumber: string;
}

export interface CustomerMembership {
  businessId: string;
  businessName: string;
  status: 'active' | 'inactive';
}

export interface PublicCustomerInfo {
  id: string;
  name: string;
  phoneNumber: string;
  birthdate?: string;
  hasMembership: boolean;
  memberships: CustomerMembership[];
}

export interface PublicCustomerLookupResponse {
  exists: boolean;
  customer?: PublicCustomerInfo;
}

export interface PublicJoinBusinessDto {
  qrId: string;
  branchQrId?: string;
  name: string;
  birthdate?: string;
  phoneNumber: string;
}

export interface PublicCustomer {
  id: string;
  name: string;
  phoneNumber: string;
  birthdate?: string;
}

export interface PublicMembership {
  id: string;
  businessId: string;
  businessName: string;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export interface PublicSession {
  token: string;
  expiresAt: string;
}

export interface PublicJoinBusinessResponse {
  customer: PublicCustomer;
  membership: PublicMembership;
  personalQrCredential?: string;
  session: PublicSession;
}

/**
 * Public API endpoints for QR discovery and customer onboarding
 * These endpoints do NOT require authentication
 */
export const publicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Discover business information from a QR code
     * Can be a business public_qr_id or branch qr_code_id
     */
    discoverBusiness: builder.query<PublicBusinessDiscoveryResponse, string>({
      query: (qrId) => `/public/businesses/qr/${qrId}`,
    }),

    /**
     * Look up an existing customer by phone number
     * Returns existence check without revealing full details to prevent enumeration
     */
    lookupCustomer: builder.mutation<PublicCustomerLookupResponse, PublicCustomerLookupDto>({
      query: (body) => ({
        url: '/public/customers/lookup',
        method: 'POST',
        body,
      }),
    }),

    /**
     * Join a business and create a customer account
     * Creates user, customer account, membership, and session
     * Returns personal QR credential and sets HTTP-only session cookie
     */
    joinBusiness: builder.mutation<PublicJoinBusinessResponse, PublicJoinBusinessDto>({
      query: (body) => ({
        url: '/public/customers/join',
        method: 'POST',
        body,
        credentials: 'include',
      }),
    }),
  }),
});

export const {
  useDiscoverBusinessQuery,
  useLookupCustomerMutation,
  useJoinBusinessMutation,
} = publicApi;
