import { baseApi } from '../../../services/api/baseApi';
import type { MerchantProfile } from '../types/merchant.types';
import type {
  RegisterCustomerDto,
  RegisterCustomerResponse,
} from '../dto/register-customer.dto';

export const merchantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMerchantProfile: build.query<MerchantProfile, void>({
      query: () => '/merchants/profile',
      providesTags: ['MerchantProfile'],
    }),
    registerCustomer: build.mutation<RegisterCustomerResponse, RegisterCustomerDto>({
      query: (body) => ({
        url: '/merchants/customers/register',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetMerchantProfileQuery,
  useRegisterCustomerMutation,
} = merchantApi;
