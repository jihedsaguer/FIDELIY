import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const baseUrl = configuredBaseUrl.startsWith('/')
  ? new URL(configuredBaseUrl, window.location.origin).toString()
  : configuredBaseUrl;

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
  }),
  tagTypes: ['Session', 'CustomerProfile', 'MerchantProfile', 'BusinessSetup', 'Branch', 'Program'],
  endpoints: () => ({}),
});
