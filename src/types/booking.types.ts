// src/types/booking.types.ts
import type { IApiResponse, IPaginatedResponse } from '@/types/api';
import type { StatusTone } from '@/lib/status-colors';

export type BookingStatusValue =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export const BOOKING_STATUSES: BookingStatusValue[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
];

export const BOOKING_STATUS_LABEL: Record<BookingStatusValue, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  EXPIRED: 'Expired',
};

export const BOOKING_STATUS_TONE: Record<BookingStatusValue, StatusTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CHECKED_IN: 'success',
  CHECKED_OUT: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  EXPIRED: 'neutral',
};

export type BookingActionValue =
  | 'confirm'
  | 'cancel'
  | 'check_in'
  | 'check_out'
  | 'no_show';

/** One itemized tax/fee line frozen onto the booking. */
export interface ITaxBreakdownLine {
  name: string;
  rateBps: number;
  amount: number;
}

/** Booking as returned by the admin list. */
export interface IBookingRow {
  id: string;
  code: string;
  roomTypeId: string;
  roomId: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: BookingStatusValue;
  source: 'WEBSITE' | 'MANUAL';
  baseAmount: number;
  occupancyAmount: number;
  discountAmount: number;
  taxAmount: number;
  taxBreakdown: ITaxBreakdownLine[] | null;
  totalAmount: number;
  refundedAmount: number;
  currency: string;
  discountCode: string | null;
  specialRequests: string | null;
  holdExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  roomType: { id: string; name: string };
  room: { id: string; name: string } | null;
}

export interface IBookingPaymentLine {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** Full detail payload (adds slug, discount and the payment ledger). */
export interface IBookingDetail extends IBookingRow {
  roomType: { id: string; name: string; slug: string };
  discount: { id: string; name: string; code: string | null } | null;
  payments: IBookingPaymentLine[];
}

export interface IBookingsQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: BookingStatusValue;
  roomTypeId?: string;
  /** Stays overlapping [from, to), YYYY-MM-DD. */
  from?: string;
  to?: string;
}

/** POST /api/admin/bookings body (walk-in / phone booking). */
export interface IManualBookingBody {
  roomTypeId: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  totalOverride?: number;
}

export type IBookingsResponse = IPaginatedResponse<IBookingRow[]>;
export type IBookingResponse = IApiResponse<IBookingDetail>;
