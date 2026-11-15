import { baseApi } from "../../../services/api/baseApi";
import type { AuthSession, CustomerProfile } from "../types/auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSession: build.query<AuthSession | null, void>({
      query: () => "/auth/get-session",
      providesTags: ["Session"],
    }),
    phoneSignIn: build.mutation<{ user: AuthSession["user"] }, string>({
      query: (phoneNumber) => ({
        url: "/auth/phone/sign-in",
        method: "POST",
        body: { phoneNumber },
      }),
      invalidatesTags: ["Session", "CustomerProfile"],
    }),
    sendCustomerOtp: build.mutation<{ status: boolean }, string>({
      query: (phoneNumber) => ({
        url: "/auth/phone-number/send-otp",
        method: "POST",
        body: { phoneNumber },
      }),
    }),
    verifyCustomerOtp: build.mutation<
      { status: boolean; user?: AuthSession["user"] },
      { phoneNumber: string; code: string }
    >({
      query: (body) => ({
        url: "/auth/phone-number/verify",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Session", "CustomerProfile", "MerchantProfile", "BusinessSetup"],
    }),
    registerMerchant: build.mutation<
      { user: AuthSession["user"] },
      { name: string; email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/sign-up/email", method: "POST", body }),
      invalidatesTags: ["Session", "CustomerProfile", "MerchantProfile", "BusinessSetup"],
    }),
    loginMerchant: build.mutation<
      { user: AuthSession["user"] },
      { email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/sign-in/email", method: "POST", body }),
      invalidatesTags: ["Session", "CustomerProfile", "MerchantProfile", "BusinessSetup"],
    }),
    signOut: build.mutation<{ success?: boolean }, void>({
      query: () => ({ url: "/auth/sign-out", method: "POST", body: {} }),
      invalidatesTags: ["Session", "CustomerProfile", "MerchantProfile", "BusinessSetup"],
    }),
    getCustomerProfile: build.query<CustomerProfile, void>({
      query: () => "/customers/profile",
      providesTags: ["CustomerProfile"],
    }),
  }),
});

export const {
  useGetSessionQuery,
  usePhoneSignInMutation,
  useSendCustomerOtpMutation,
  useVerifyCustomerOtpMutation,
  useRegisterMerchantMutation,
  useLoginMerchantMutation,
  useSignOutMutation,
  useGetCustomerProfileQuery,
} = authApi;
