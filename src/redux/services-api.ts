// src/redux/services-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  ICreateServiceBody,
  IServicesQueryParams,
  IServicesResponse,
  IServiceResponse,
  IUpdateServiceBody,
} from '@/types/service.types';

export const servicesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getServices: builder.query<
      IServicesResponse,
      IServicesQueryParams
    >({
      query: (params) => toQueryString('admin/services', params),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Service' as const,
                id,
              })),
              { type: 'Services' as const, id: 'LIST' },
            ]
          : [{ type: 'Services' as const, id: 'LIST' }],
    }),
    getService: builder.query<IServiceResponse, string>({
      query: (id) => `admin/services/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Service', id }],
    }),
    createService: builder.mutation<IServiceResponse, ICreateServiceBody>({
      query: (body) => ({ url: 'admin/services', method: 'POST', body }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }],
    }),
    updateService: builder.mutation<
      IServiceResponse,
      { id: string; body: IUpdateServiceBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/services/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),
    deleteService: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `admin/services/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Service', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),
    addServicePhotos: builder.mutation<
      IApiResponse<unknown>,
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `admin/services/${id}/photos`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Service', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),
    deleteServicePhoto: builder.mutation<
      IApiResponse<{ id: string }>,
      { serviceId: string; photoId: string }
    >({
      query: ({ serviceId, photoId }) => ({
        url: `admin/services/${serviceId}/photos/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { serviceId }) => [
        { type: 'Service', id: serviceId },
        { type: 'Services', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetServicesQuery,
  useGetServiceQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useAddServicePhotosMutation,
  useDeleteServicePhotoMutation,
} = servicesApi;
