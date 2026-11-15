import { baseApi } from '../../../services/api/baseApi';

/**
 * Branch DTO types
 */
export interface BranchDto {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  qrCodeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchListResponse {
  branches: BranchDto[];
  total: number;
}

export interface CreateBranchRequest {
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string | null;
  phone?: string | null;
}

/**
 * RTK Query API for merchant branch management endpoints
 */
export const branchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Query: List all branches for the authenticated merchant's business
     */
    listBranches: builder.query<BranchListResponse, void>({
      query: () => ({
        url: '/merchants/branches',
        method: 'GET',
      }),
      providesTags: ['Branch'],
    }),

    /**
     * Query: Get a specific branch by ID
     */
    getBranch: builder.query<BranchDto, string>({
      query: (branchId) => ({
        url: `/merchants/branches/${branchId}`,
        method: 'GET',
      }),
      providesTags: ['Branch'],
    }),

    /**
     * Mutation: Create a new branch
     */
    createBranch: builder.mutation<BranchDto, CreateBranchRequest>({
      query: (body) => ({
        url: '/merchants/branches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Branch', 'BusinessSetup'],
    }),

    /**
     * Mutation: Update an existing branch
     */
    updateBranch: builder.mutation<BranchDto, { branchId: string; data: UpdateBranchRequest }>({
      query: ({ branchId, data }) => ({
        url: `/merchants/branches/${branchId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Branch', 'BusinessSetup'],
    }),

    /**
     * Mutation: Delete a branch
     */
    deleteBranch: builder.mutation<{ success: boolean; message: string }, string>({
      query: (branchId) => ({
        url: `/merchants/branches/${branchId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branch', 'BusinessSetup'],
    }),
  }),
});

// Export hooks for use in components
export const {
  useListBranchesQuery,
  useGetBranchQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} = branchApi;
