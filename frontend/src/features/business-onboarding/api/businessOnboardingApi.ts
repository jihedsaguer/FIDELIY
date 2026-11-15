import { baseApi } from '../../../services/api/baseApi';
import type { BusinessSetup } from '../types/businessOnboarding.types';

/**
 * API Response type - matches backend response structure
 * Dates are serialized as ISO strings by the HTTP layer
 */
export interface BusinessSetupResponse extends BusinessSetup {}

/**
 * Logo Upload Response - matches backend LogoUploadResponseDto
 */
export interface LogoUploadResponseDto {
  storageKey: string;
  filename: string;
  width: number;
  height: number;
  mimeType: string;
  uploadedAt: string; // ISO timestamp from backend (serialized HTTP response)
}

/**
 * Request DTOs - match backend DTO types
 */
export interface CreateBusinessRequest {
  name: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  description?: string | null;
  businessPhone?: string | null;
  phonePubliclyDisplayed?: boolean;
  logoUrl?: string | null;
  theme?: { primaryColor: string; accentColor: string } | null;
}

export interface CreateFirstBranchRequest {
  name: string;
  address: string;
}

export interface UpdateFirstBranchRequest {
  name?: string;
  address?: string | null;
  phone?: string | null;
}

/**
 * RTK Query API for merchant business onboarding endpoints
 * Provides queries and mutations for:
 * - Retrieving merchant business setup state
 * - Creating business profile
 * - Updating business details (name, colors, contact)
 * - Creating and updating first branch
 * - Completing onboarding
 * - Uploading business logo (file-based)
 */
export const businessOnboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Query: Get current business setup state
     * GET /merchants/business-setup
     * Returns: BusinessSetupResponse with business, branches, and status
     */
    getBusinessSetup: builder.query<BusinessSetupResponse, void>({
      query: () => ({
        url: '/merchants/business-setup',
        method: 'GET',
      }),
      providesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Create a new business
     * POST /merchants/business-setup/business
     * Only succeeds if merchant has no existing business
     */
    createBusiness: builder.mutation<BusinessSetupResponse, CreateBusinessRequest>({
      query: (body) => ({
        url: '/merchants/business-setup/business',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Update business details (name, logo URL, colors, contact)
     * PATCH /merchants/business-setup/business
     * Partial update - only provided fields are modified
     */
    updateBusiness: builder.mutation<BusinessSetupResponse, UpdateBusinessRequest>({
      query: (body) => ({
        url: '/merchants/business-setup/business',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Create first branch (only succeeds if no branches exist)
     * POST /merchants/business-setup/first-branch
     */
    createFirstBranch: builder.mutation<BusinessSetupResponse, CreateFirstBranchRequest>({
      query: (body) => ({
        url: '/merchants/business-setup/first-branch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Update first branch details (name, address, phone)
     * PATCH /merchants/business-setup/first-branch
     */
    updateFirstBranch: builder.mutation<BusinessSetupResponse, UpdateFirstBranchRequest>({
      query: (body) => ({
        url: '/merchants/business-setup/first-branch',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Complete business setup onboarding
     * POST /merchants/business-setup/complete
     * Only succeeds if all required fields are filled
     * Marks business as complete and stores final state
     */
    completeBusinessSetup: builder.mutation<BusinessSetupResponse, void>({
      query: () => ({
        url: '/merchants/business-setup/complete',
        method: 'POST',
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Mutation: Upload device-based logo for business
     * POST /merchants/business-setup/business/logo
     * Accepts: multipart/form-data with 'file' field
     * Returns: LogoUploadResponseDto with metadata (dimensions, storage key, etc.)
     */
    uploadLogo: builder.mutation<LogoUploadResponseDto, FormData>({
      query: (formData) => ({
        url: '/merchants/business-setup/business/logo',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['BusinessSetup'],
    }),

    /**
     * Query: Retrieve business logo
     * GET /merchants/business-setup/business/logo
     * Returns: Image file with appropriate Content-Type header
     * Note: Used for displaying logo in merchant dashboard
     */
    getLogo: builder.query<Blob, void>({
      query: () => ({
        url: '/merchants/business-setup/business/logo',
        method: 'GET',
        responseHandler: 'content-type', // Return Blob for image content
      }),
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetBusinessSetupQuery,
  useCreateBusinessMutation,
  useUpdateBusinessMutation,
  useCreateFirstBranchMutation,
  useUpdateFirstBranchMutation,
  useCompleteBusinessSetupMutation,
  useUploadLogoMutation,
  useGetLogoQuery,
} = businessOnboardingApi;
