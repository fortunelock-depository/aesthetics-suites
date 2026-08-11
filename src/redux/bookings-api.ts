// src/redux/bookings-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type {
  IBookingResponse,
  IBookingsQueryParams,
  IBookingsResponse,
  IManualBookingBody,
} from '@/types/booking.types';

export const bookingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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
  useGetBookingsQuery,
  useGetBookingQuery,
  useCreateManualBookingMutation,
  useApplyBookingActionMutation,
} = bookingsApi;
