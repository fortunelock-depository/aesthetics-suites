// src/redux/bookings-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type {
  IAvailabilityQueryParams,
  IAvailabilityResponse,
  IBookingResponse,
  IBookingsQueryParams,
  IBookingsResponse,
  IManualBookingBody,
  IPublicBookingBody,
  IPublicBookingResponse,
} from '@/types/booking.types';

export const bookingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Public availability + server-computed price quote. Never cached
     * long: availability changes as others book.
     */
    getRoomAvailability: builder.query<
      IAvailabilityResponse,
      IAvailabilityQueryParams
    >({
      query: ({ slug, ...params }) =>
        toQueryString(`rooms/${slug}/availability`, params),
      keepUnusedDataFor: 30,
    }),
    /** Public checkout: holds a unit, returns the Paystack redirect URL. */
    createPublicBooking: builder.mutation<
      IPublicBookingResponse,
      IPublicBookingBody
    >({
      query: (body) => ({ url: 'bookings', method: 'POST', body }),
    }),
    getBookings: builder.query<IBookingsResponse, IBookingsQueryParams>({
      query: (params) => toQueryString('admin/bookings', params),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Booking' as const,
                id,
              })),
              { type: 'Bookings' as const, id: 'LIST' },
            ]
          : [{ type: 'Bookings' as const, id: 'LIST' }],
    }),
    getBooking: builder.query<IBookingResponse, string>({
      query: (id) => `admin/bookings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
    }),
    createManualBooking: builder.mutation<
      IBookingResponse,
      IManualBookingBody
    >({
      query: (body) => ({ url: 'admin/bookings', method: 'POST', body }),
      invalidatesTags: [{ type: 'Bookings', id: 'LIST' }, 'Overview'],
    }),
    /** confirm / cancel / check_in / check_out / no_show. */
    applyBookingAction: builder.mutation<
      IBookingResponse,
      {
        id: string;
        action: 'confirm' | 'cancel' | 'check_in' | 'check_out' | 'no_show';
        reason?: string;
        refund?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `admin/bookings/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Booking', id },
        { type: 'Bookings', id: 'LIST' },
        'Payments',
        'Overview',
      ],
    }),
  }),
});

export const {
  useGetRoomAvailabilityQuery,
  useCreatePublicBookingMutation,
  useGetBookingsQuery,
  useGetBookingQuery,
  useCreateManualBookingMutation,
  useApplyBookingActionMutation,
} = bookingsApi;
