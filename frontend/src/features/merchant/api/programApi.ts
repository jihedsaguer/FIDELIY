import { baseApi } from '../../../services/api/baseApi';

/**
 * Programme DTO types
 */
export type ProgramType = 'stamps' | 'points' | 'both';
export type ProgramStatus = 'active' | 'inactive';

export interface ProgramDto {
  id: string;
  businessId: string;
  name: string | null;
  description: string | null;
  type: ProgramType;
  version: number;
  status: ProgramStatus;
  activatedAt: string;
  deactivatedAt: string | null;
  createdAt: string;
  configurations: Record<string, Record<string, unknown>>;
}

export interface ProgramListResponse {
  programs: ProgramDto[];
  total: number;
}

export interface ProgramConfigurationRequest {
  type: ProgramType;
  configurations: Record<string, Record<string, unknown>>;
}

export interface EnhancedProgramConfigurationRequest {
  name?: string;
  description?: string;
  type: ProgramType;
  stamps?: {
    earningRule: { purchasesPerStamp: number; description?: string };
    rewardThresholds: Array<{
      stampsRequired: number;
      name: string;
      description?: string;
      isActive?: boolean;
    }>;
    stampExpirationDays?: number | null;
  };
  points?: {
    earningRule: { pointsPerCurrencyUnit: number; currencyCode?: string; description?: string };
    rewardThresholds: Array<{
      pointsRequired: number;
      name: string;
      description?: string;
      isActive?: boolean;
    }>;
    pointsExpirationDays?: number | null;
  };
}

export interface UpdateProgramRequest {
  name?: string;
  description?: string;
}

/**
 * RTK Query API for merchant programme management endpoints
 */
export const programApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Query: Get the current active programme
     */
    getCurrentProgram: builder.query<ProgramDto | null, void>({
      query: () => ({
        url: '/programs/current',
        method: 'GET',
      }),
      providesTags: ['Program'],
    }),

    /**
     * Query: Get programme history
     */
    getProgramHistory: builder.query<ProgramDto[], void>({
      query: () => ({
        url: '/programs/history',
        method: 'GET',
      }),
      providesTags: ['Program'],
    }),

    /**
     * Query: Get a specific programme by ID
     */
    getProgram: builder.query<ProgramDto, string>({
      query: (programId) => ({
        url: `/programs/${programId}`,
        method: 'GET',
      }),
      providesTags: ['Program'],
    }),

    /**
     * Query: List all programmes
     */
    listPrograms: builder.query<ProgramListResponse, void>({
      query: () => ({
        url: '/programs',
        method: 'GET',
      }),
      providesTags: ['Program'],
    }),

    /**
     * Mutation: Create initial programme (original JSON-based format)
     */
    createInitialProgram: builder.mutation<ProgramDto, ProgramConfigurationRequest>({
      query: (body) => ({
        url: '/programs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Mutation: Create new programme version (original JSON-based format)
     */
    createProgramVersion: builder.mutation<ProgramDto, ProgramConfigurationRequest>({
      query: (body) => ({
        url: '/programs/versions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Mutation: Create programme with enhanced configuration
     */
    createEnhancedProgram: builder.mutation<ProgramDto, EnhancedProgramConfigurationRequest>({
      query: (body) => ({
        url: '/programs/enhanced',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Mutation: Update programme metadata (name, description)
     */
    updateProgram: builder.mutation<
      ProgramDto,
      { programId: string; data: UpdateProgramRequest }
    >({
      query: ({ programId, data }) => ({
        url: `/programs/${programId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Mutation: Deactivate a programme
     */
    deactivateProgram: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (programId) => ({
        url: `/programs/${programId}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Program'],
    }),

    /**
     * Mutation: Delete a programme
     */
    deleteProgram: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (programId) => ({
        url: `/programs/${programId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Program'],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetCurrentProgramQuery,
  useGetProgramHistoryQuery,
  useGetProgramQuery,
  useListProgramsQuery,
  useCreateInitialProgramMutation,
  useCreateProgramVersionMutation,
  useCreateEnhancedProgramMutation,
  useUpdateProgramMutation,
  useDeactivateProgramMutation,
  useDeleteProgramMutation,
} = programApi;
