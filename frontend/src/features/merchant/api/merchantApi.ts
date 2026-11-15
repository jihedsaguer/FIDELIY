import { baseApi } from '../../../services/api/baseApi';
import type { MerchantProfile } from '../types/merchant.types';

export const merchantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMerchantProfile: build.query<MerchantProfile, void>({
      query: () => '/merchants/profile',
      providesTags: ['MerchantProfile'],
    }),
  }),
});

export const { useGetMerchantProfileQuery } = merchantApi;
