// src/redux/overview-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type {
  DashboardPreset,
  IOverviewResponse,
} from '@/types/overview.types';

export const overviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query<
      IOverviewResponse,
      { preset?: DashboardPreset; from?: string; to?: string } | void
    >({
      query: (params) =>
        toQueryString('admin/overview', {
          preset: params?.preset,
          from: params?.from,
          to: params?.to,
        }),
      providesTags: ['Overview'],
      // Keep the cached result for 2 minutes so navigating back is instant.
      keepUnusedDataFor: 120,
    }),
  }),
});

export const { useGetOverviewQuery } = overviewApi;
