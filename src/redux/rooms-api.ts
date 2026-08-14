// src/redux/rooms-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  ICreateRoomTypeBody,
  ICreateRoomUnitBody,
  ICreateSeasonRateBody,
  IRoomTypeResponse,
  IRoomTypesQueryParams,
  IRoomTypesResponse,
  IRoomUnitResponse,
  ISeasonRateResponse,
  IUpdateRoomTypeBody,
  IUpdateRoomUnitBody,
  IUpdateSeasonRateBody,
} from '@/types/room.types';

/**
 * Units and season rates live inside the room-type detail payload, so
 * every unit/rate mutation invalidates its parent `RoomType` tag - the
 * detail page refetches itself and stays the single source of truth.
 */
export const roomsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoomTypes: builder.query<IRoomTypesResponse, IRoomTypesQueryParams>({
      query: (params) => toQueryString('admin/room-types', params),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'RoomType' as const,
                id,
              })),
              { type: 'RoomTypes' as const, id: 'LIST' },
            ]
          : [{ type: 'RoomTypes' as const, id: 'LIST' }],
    }),
    getRoomType: builder.query<IRoomTypeResponse, string>({
      query: (id) => `admin/room-types/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'RoomType', id }],
    }),
    createRoomType: builder.mutation<IRoomTypeResponse, ICreateRoomTypeBody>({
      query: (body) => ({ url: 'admin/room-types', method: 'POST', body }),
      invalidatesTags: [{ type: 'RoomTypes', id: 'LIST' }, 'Overview'],
    }),
    updateRoomType: builder.mutation<
      IRoomTypeResponse,
      { id: string; body: IUpdateRoomTypeBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/room-types/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'RoomType', id },
        { type: 'RoomTypes', id: 'LIST' },
      ],
    }),
    deleteRoomType: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `admin/room-types/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'RoomType', id },
        { type: 'RoomTypes', id: 'LIST' },
        'Overview',
      ],
    }),

    addRoomTypePhotos: builder.mutation<
      IApiResponse<unknown>,
      { id: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: `admin/room-types/${id}/photos`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'RoomType', id },
        { type: 'RoomTypes', id: 'LIST' },
      ],
    }),
    deleteRoomTypePhoto: builder.mutation<
      IApiResponse<{ id: string }>,
      { roomTypeId: string; photoId: string }
    >({
      query: ({ roomTypeId, photoId }) => ({
        url: `admin/room-types/${roomTypeId}/photos/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
        { type: 'RoomTypes', id: 'LIST' },
      ],
    }),

    createRoomUnit: builder.mutation<IRoomUnitResponse, ICreateRoomUnitBody>({
      query: (body) => ({ url: 'admin/rooms', method: 'POST', body }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
        { type: 'RoomTypes', id: 'LIST' },
      ],
    }),
    updateRoomUnit: builder.mutation<
      IRoomUnitResponse,
      { id: string; roomTypeId: string; body: IUpdateRoomUnitBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/rooms/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),
    deleteRoomUnit: builder.mutation<
      IApiResponse<{ id: string }>,
      { id: string; roomTypeId: string }
    >({
      query: ({ id }) => ({ url: `admin/rooms/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
        { type: 'RoomTypes', id: 'LIST' },
      ],
    }),
    syncRoomIcal: builder.mutation<
      IApiResponse<unknown>,
      { id: string; roomTypeId: string }
    >({
      query: ({ id }) => ({
        url: `admin/rooms/${id}/sync-ical`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),
    // The export URL is a capability; rotating the token is the only way
    // to revoke a leaked calendar link.
    rotateRoomIcalToken: builder.mutation<
      IApiResponse<{ id: string; icalToken: string }>,
      { id: string; roomTypeId: string }
    >({
      query: ({ id }) => ({
        url: `admin/rooms/${id}/rotate-ical-token`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),

    createSeasonRate: builder.mutation<
      ISeasonRateResponse,
      ICreateSeasonRateBody
    >({
      query: (body) => ({ url: 'admin/season-rates', method: 'POST', body }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),
    updateSeasonRate: builder.mutation<
      ISeasonRateResponse,
      { id: string; roomTypeId: string; body: IUpdateSeasonRateBody }
    >({
      query: ({ id, body }) => ({
        url: `admin/season-rates/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),
    deleteSeasonRate: builder.mutation<
      IApiResponse<{ id: string }>,
      { id: string; roomTypeId: string }
    >({
      query: ({ id }) => ({
        url: `admin/season-rates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roomTypeId }) => [
        { type: 'RoomType', id: roomTypeId },
      ],
    }),
  }),
});

export const {
  useGetRoomTypesQuery,
  useGetRoomTypeQuery,
  useCreateRoomTypeMutation,
  useUpdateRoomTypeMutation,
  useDeleteRoomTypeMutation,
  useAddRoomTypePhotosMutation,
  useDeleteRoomTypePhotoMutation,
  useCreateRoomUnitMutation,
  useUpdateRoomUnitMutation,
  useDeleteRoomUnitMutation,
  useSyncRoomIcalMutation,
  useRotateRoomIcalTokenMutation,
  useCreateSeasonRateMutation,
  useUpdateSeasonRateMutation,
  useDeleteSeasonRateMutation,
} = roomsApi;
