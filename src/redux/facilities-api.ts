// src/redux/facilities-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  ICreateFacilityBody,
  IFacilitiesQueryParams,
  IFacilitiesResponse,
  IFacilityResponse,
  IUpdateFacilityBody,
} from '@/types/facility.types';

export const facilitiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFacilities: builder.query<
      IFacilitiesResponse,
      IFacilitiesQueryParams
    >({
      query: (params) => toQueryString('admin/facilities', params),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Facility' as const,
                id,
              })),
              { type: 'Facilities' as const, id: 'LIST' },
            ]
          : [{ type: 'Facilities' as const, id: 'LIST' }],
    }),
    getFacility: builder.query<IFacilityResponse, string>({
      query: (id) => `admin/facilities/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Facility', id }],
    }),
    createFacility: builder.mutation<IFacilityResponse, ICreateFacilityBody>({
      query: (body) => ({ url: 'admin/facilities', method: 'POST', body }),
      invalidatesTags: [{ type: 'Facilities', id: 'LIST' }],
    }),
    updateFacility: builder.mutation<
      IFacilityResponse,
      { id: string; body: IUpdateFacilityBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/facilities/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Facility', id },
        { type: 'Facilities', id: 'LIST' },
      ],
    }),
    deleteFacility: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `admin/facilities/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Facility', id },
        { type: 'Facilities', id: 'LIST' },
      ],
    }),
    addFacilityPhotos: builder.mutation<
      IApiResponse<unknown>,
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `admin/facilities/${id}/photos`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Facility', id },
        { type: 'Facilities', id: 'LIST' },
      ],
    }),
    deleteFacilityPhoto: builder.mutation<
      IApiResponse<{ id: string }>,
      { facilityId: string; photoId: string }
    >({
      query: ({ facilityId, photoId }) => ({
        url: `admin/facilities/${facilityId}/photos/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { facilityId }) => [
        { type: 'Facility', id: facilityId },
        { type: 'Facilities', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetFacilitiesQuery,
  useGetFacilityQuery,
  useCreateFacilityMutation,
  useUpdateFacilityMutation,
  useDeleteFacilityMutation,
  useAddFacilityPhotosMutation,
  useDeleteFacilityPhotoMutation,
} = facilitiesApi;
