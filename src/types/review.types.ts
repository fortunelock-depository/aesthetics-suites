// src/types/review.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';
import type { StatusTone } from '@/lib/status-colors';

export type ReviewStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REVIEW_STATUSES: ReviewStatusValue[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export const REVIEW_STATUS_LABEL: Record<ReviewStatusValue, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const REVIEW_STATUS_TONE: Record<ReviewStatusValue, StatusTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'neutral',
};

/** Review as returned by the admin moderation queue. */
export interface IAdminReviewRow {
  id: string;
  roomTypeId: string;
  guestName: string;
  guestEmail: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatusValue;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roomType: { id: string; name: string; slug: string };
  /** Present = a verified stay. */
  booking: { code: string } | null;
}

/** Review as shown publicly under a listing. */
export interface IPublicReviewItem {
  id: string;
  guestName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedStay: boolean;
  createdAt: string;
}

export interface IAdminReviewsQueryParams {
  page: number;
  limit: number;
  status?: ReviewStatusValue;
  roomTypeId?: string;
  search?: string;
}

export type IAdminReviewsResponse = IPaginatedResponse<IAdminReviewRow[]>;
export type IPublicReviewsResponse = IPaginatedResponse<IPublicReviewItem[]>;
export type IReviewResponse = IApiResponse<IAdminReviewRow>;
