// src/types/overview.types.ts
import type { IApiResponse } from '@/types/api';

export type DashboardPreset =
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_90_DAYS'
  | 'THIS_YEAR';

export interface ITrendData {
  percentage: number;
  direction: 'upward' | 'downward' | 'neutral';
}

export interface IDashboardStats {
  range: { preset: DashboardPreset; startDate: string; endDate: string };
  today: {
    arrivals: number;
    departures: number;
    inHouse: number;
    pendingHolds: number;
  };
  occupancy: {
    /** Percentage 0..100 (one decimal). */
    rate: number;
    occupiedNights: number;
    availableNights: number;
  };
  bookings: { count: number; trend: ITrendData };
  revenue: {
    /** Minor units. */
    total: number;
    count: number;
    average: number;
    trend: ITrendData;
  };
  refunds: { total: number; count: number };
  revenueByMonth: { month: string; revenue: number; bookings: number }[];
  bookingsByStatus: Record<string, number>;
  topRoomTypes: {
    id: string;
    name: string;
    revenue: number;
    bookings: number;
  }[];
  sources: { website: number; manual: number };
  needsAttention: {
    pendingReviews: number;
    pendingHolds: number;
    arrivalsDue: number;
    staleCalendars: number;
    failedPayments7d: number;
  };
  recentBookings: {
    id: string;
    code: string;
    guestName: string;
    status: string;
    checkIn: string;
    nights: number;
    totalAmount: number;
    currency: string;
    createdAt: string;
    roomType: { name: string };
  }[];
  upcomingArrivals: {
    id: string;
    code: string;
    guestName: string;
    checkIn: string;
    nights: number;
    adults: number;
    children: number;
    roomType: { name: string };
    room: { name: string } | null;
  }[];
}

export type IOverviewResponse = IApiResponse<IDashboardStats>;
