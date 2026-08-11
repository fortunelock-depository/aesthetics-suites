// src/redux/api-slice.ts
//
// The one and only `createApi`. Feature endpoints attach via
// `apiSlice.injectEndpoints` (see overview-api.ts) - never create a second
// slice. The 401 handling and the tag registry live here so nothing else
// reimplements them.
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { apiSliceTags } from '@/types/api';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/',
  credentials: 'include',
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // Session expired / not signed in: bounce to login. The session cookie is
  // issued by this same app (server actions), so there is no refresh flow -
  // an invalid session means signing in again.
  if (result.error?.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: apiSliceTags,
  endpoints: () => ({}),
});
