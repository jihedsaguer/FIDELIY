import { baseApi } from '../../../services/api/baseApi';
import type { MerchantProfile } from '../types/merchant.types';
import type {
  RegisterCustomerDto,
  RegisterCustomerResponse,
} from '../dto/register-customer.dto';

export type MerchantCustomerStatus = 'active' | 'inactive';

export interface MerchantCustomerListParams {
  search?: string;
  status?: MerchantCustomerStatus;
  limit?: number;
  offset?: number;
}

export interface MerchantCustomerItem {
  membershipId: string;
  customer: { name: string; phoneNumber: string };
  status: MerchantCustomerStatus;
  joinedAt: string;
  leftAt: string | null;
  balance: { stamps: number; points: number };
  lastActivityAt: string | null;
}

export interface MerchantCustomerListResponse {
  items: MerchantCustomerItem[];
  total: number;
}

export const merchantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMerchantProfile: build.query<MerchantProfile, void>({
      query: () => '/merchants/profile',
      providesTags: ['MerchantProfile'],
    }),
    listMerchantCustomers: build.query<MerchantCustomerListResponse, MerchantCustomerListParams>({
      query: (params) => ({ url: '/merchants/customers', params }),
      providesTags: ['MerchantCustomers'],
    }),
    registerCustomer: build.mutation<RegisterCustomerResponse, RegisterCustomerDto>({
      query: (body) => ({
        url: '/merchants/customers/register',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MerchantCustomers'],
    }),
  }),
});

export const {
  useGetMerchantProfileQuery,
  useListMerchantCustomersQuery,
  useRegisterCustomerMutation,
} = merchantApi;
