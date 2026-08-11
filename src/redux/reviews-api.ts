// src/redux/reviews-api.ts
import { apiSlice } from './api-slice';
import { toQueryString } from '@/utils/query-params';
import type { IApiResponse } from '@/types/api';
import type {
  IAdminReviewsQueryParams,
  IAdminReviewsResponse,
  IPublicReviewsResponse,
  IReviewResponse,
} from '@/types/review.types';

export const reviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** Admin moderation queue (status/room/search, server-paginated). */
    getAdminReviews: builder.query<
      IAdminReviewsResponse,
      IAdminReviewsQueryParams
    >({
      query: (params) => toQueryString('admin/reviews', params),
      providesTags: [{ type: 'Reviews', id: 'LIST' }],
    }),
    /**
     * Public approved reviews under a listing - server-paginated, since a
     * popular room's reviews grow without bound.
     */
    getRoomReviews: builder.query<
      IPublicReviewsResponse,
      { slug: string; page: number; limit: number }
    >({
      query: ({ slug, ...params }) =>
        toQueryString(`rooms/${slug}/reviews`, params),
      providesTags: [{ type: 'Reviews', id: 'PUBLIC' }],
    }),
    /** Guest review submission - lands in PENDING moderation. */
    createRoomReview: builder.mutation<
      IApiResponse<{ id?: string; status: string }>,
      {
        slug: string;
        guestName: string;
        guestEmail: string;
        rating: number;
        title?: string;
        body: string;
        bookingCode?: string;
        website?: string;
      }
    >({
      query: ({ slug, ...body }) => ({
        url: `rooms/${slug}/reviews`,
        method: 'POST',
        body,
      }),
    }),
    moderateReview: builder.mutation<
      IReviewResponse,
      { id: string; action: 'approve' | 'reject' }
    >({
      query: ({ id, action }) => ({
        url: `admin/reviews/${id}`,
        method: 'PATCH',
        body: { action },
      }),
      // Approval changes what the public list shows too.
      invalidatesTags: [
        { type: 'Reviews', id: 'LIST' },
        { type: 'Reviews', id: 'PUBLIC' },
        { type: 'RoomTypes', id: 'LIST' },
        'Overview',
      ],
    }),
    deleteReview: builder.mutation<IApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `admin/reviews/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Reviews', id: 'LIST' },
        { type: 'Reviews', id: 'PUBLIC' },
        { type: 'RoomTypes', id: 'LIST' },
        'Overview',
      ],
    }),
  }),
});

export const {
  useGetAdminReviewsQuery,
  useGetRoomReviewsQuery,
  useCreateRoomReviewMutation,
  useModerateReviewMutation,
  useDeleteReviewMutation,
} = reviewsApi;
