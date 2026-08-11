// src/redux/discounts-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  ICreateDiscountBody,
  IDiscountResponse,
  IDiscountsQueryParams,
  IDiscountsResponse,
  IUpdateDiscountBody,
} from '@/types/discount.types';

export const discountsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDiscounts: builder.query<IDiscountsResponse, IDiscountsQueryParams>({
      query: (params) => toQueryString('admin/discounts', params),
      providesTags: [{ type: 'Discounts', id: 'LIST' }],
    }),
    createDiscount: builder.mutation<IDiscountResponse, ICreateDiscountBody>({
      query: (body) => ({ url: 'admin/discounts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Discounts', id: 'LIST' }],
    }),
    updateDiscount: builder.mutation<
      IDiscountResponse,
      { id: string; body: IUpdateDiscountBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/discounts/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Discounts', id: 'LIST' }],
    }),
    deleteDiscount: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `admin/discounts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Discounts', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetDiscountsQuery,
  useCreateDiscountMutation,
  useUpdateDiscountMutation,
  useDeleteDiscountMutation,
} = discountsApi;
