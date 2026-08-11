// src/types/api.ts
//
// The RTK Query tag registry and the shared API envelope shapes produced by
// src/utils/api-response.ts. Add a tag here whenever a new feature api file
// needs cache invalidation.

export const apiSliceTags = [
  'Overview',
  'Users',
  'User',
  'RoomTypes',
  'RoomType',
  'Rooms',
  'Bookings',
  'Booking',
  'SeasonRates',
  'Discounts',
  'Reviews',
  'Facilities',
  'Facility',
  'Services',
  'Service',
  'Payments',
] as const;

export type ApiTag = (typeof apiSliceTags)[number];

/** Envelope returned by successResponse. */
export interface IApiResponse<T> {
  status: 'success';
  message: string;
  data: T;
}

export interface IPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** Envelope returned by paginatedResponse. */
export interface IPaginatedResponse<T> extends IApiResponse<T> {
  pagination: IPagination;
}
