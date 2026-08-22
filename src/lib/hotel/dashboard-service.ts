// src/lib/hotel/dashboard-service.ts
//
// Read-side aggregation for the admin dashboard: a date-range preset
// drives the headline cards, each carrying a trend vs the previous period
// of equal length; alongside sit today's
// operations, a 12-month revenue series, breakdowns, a needs-attention
// summary and recent activity.
import 'server-only';
import prisma, {
  BookingStatus,
  PaymentStatus,
  RoomStatus,
} from '@/lib/prisma';
import { BLOCKING_STATUSES } from './availability';
import { todayUtc } from './dates';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_BOOKINGS_LIMIT = 8;
const UPCOMING_ARRIVALS_DAYS = 7;
const STALE_CALENDAR_HOURS = 24;

// The shared dashboard contract lives in types/overview.types.ts - one
// definition for the API, the service and the client.
export type {
  DashboardPreset,
  ITrendData,
} from '@/types/overview.types';
import type {
  DashboardPreset,
  ITrendData,
} from '@/types/overview.types';

/** Statuses that represent real (revenue-bearing) stays. */
const REVENUE_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
];

function resolveRange(
  preset: DashboardPreset,
  now = new Date(),
  /** CUSTOM only: [start, end) resolved by the route from ?from&to. */
  custom?: { start: Date; end: Date },
) {
  const today = todayUtc();
  const startOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );

  let start: Date;
  let end: Date;
  if (preset === 'CUSTOM' && custom) {
    ({ start, end } = custom);
    const length = end.getTime() - start.getTime();
    return {
      start,
      end,
      previousStart: new Date(start.getTime() - length),
      previousEnd: start,
    };
  }
  switch (preset) {
    case 'TODAY':
      start = today;
      end = new Date(today.getTime() + MS_PER_DAY);
      break;
    case 'THIS_WEEK': {
      // Monday-anchored week.
      const day = (today.getUTCDay() + 6) % 7;
      start = new Date(today.getTime() - day * MS_PER_DAY);
      end = new Date(start.getTime() + 7 * MS_PER_DAY);
      break;
    }
    case 'LAST_MONTH':
      start = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
      );
      end = startOfMonth;
      break;
    case 'LAST_90_DAYS':
      start = new Date(today.getTime() - 90 * MS_PER_DAY);
      end = new Date(today.getTime() + MS_PER_DAY);
      break;
    case 'THIS_YEAR':
      start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      end = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));
      break;
    case 'THIS_MONTH':
    default:
      start = startOfMonth;
      end = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
      );
      break;
  }

  // The comparison window: the previous period of identical length.
  const length = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - length);

  void now;
  return { start, end, previousStart, previousEnd: start };
}

function trendOf(current: number, previous: number): ITrendData {
  if (previous === 0) {
    return current === 0
      ? { percentage: 0, direction: 'neutral' }
      : { percentage: 100, direction: 'upward' };
  }
  const percentage = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    percentage: Math.abs(percentage),
    direction:
      percentage > 0 ? 'upward' : percentage < 0 ? 'downward' : 'neutral',
  };
}

/** Overlap nights of [aStart,aEnd) with [bStart,bEnd). */
const overlapNights = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): number => {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, Math.round((end - start) / MS_PER_DAY));
};

export async function getDashboardStats(
  preset: DashboardPreset,
  custom?: { start: Date; end: Date },
) {
  const now = new Date();
  const today = todayUtc();
  const tomorrow = new Date(today.getTime() + MS_PER_DAY);
  const { start, end, previousStart, previousEnd } = resolveRange(
    preset,
    now,
    custom,
  );

  const [
    arrivalsToday,
    departuresToday,
    inHouse,
    pendingHolds,
    createdInRange,
    createdInPrevious,
    revenueBookings,
    previousRevenueBookings,
    refundsInRange,
    bookingsByStatusRaw,
    activeUnits,
    staysTouchingRange,
    blocksTouchingRange,
    last12moBookings,
    pendingReviews,
    overdueArrivals,
    staleCalendars,
    failedPayments7d,
    failedRefunds,
    recentBookings,
    upcomingArrivals,
  ] = await Promise.all([
    prisma.booking.count({
      where: { status: BookingStatus.CONFIRMED, checkIn: today },
    }),
    prisma.booking.count({
      where: { status: BookingStatus.CHECKED_IN, checkOut: today },
    }),
    prisma.booking.count({ where: { status: BookingStatus.CHECKED_IN } }),
    prisma.booking.count({
      where: { status: BookingStatus.PENDING, holdExpiresAt: { gt: now } },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: BookingStatus.EXPIRED },
      },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: previousStart, lt: previousEnd },
        status: { not: BookingStatus.EXPIRED },
      },
    }),
    prisma.booking.findMany({
      where: {
        confirmedAt: { gte: start, lt: end },
        status: { in: REVENUE_STATUSES },
      },
      select: {
        totalAmount: true,
        nights: true,
        source: true,
        roomTypeId: true,
        roomType: { select: { name: true } },
      },
    }),
    prisma.booking.aggregate({
      where: {
        confirmedAt: { gte: previousStart, lt: previousEnd },
        status: { in: REVENUE_STATUSES },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.REVERSED,
        reversedAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.room.count({ where: { status: RoomStatus.ACTIVE } }),
    prisma.booking.findMany({
      where: {
        status: { in: BLOCKING_STATUSES },
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.calendarBlock.findMany({
      where: { startDate: { lt: end }, endDate: { gt: start } },
      select: { startDate: true, endDate: true },
    }),
    prisma.booking.findMany({
      where: {
        confirmedAt: {
          gte: new Date(
            Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), 1),
          ),
        },
        status: { in: REVENUE_STATUSES },
      },
      select: { confirmedAt: true, totalAmount: true },
    }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({
      where: { status: BookingStatus.CONFIRMED, checkIn: { lt: tomorrow } },
    }),
    prisma.room.count({
      where: {
        airbnbIcalUrl: { not: null },
        OR: [
          { icalLastSyncedAt: null },
          {
            icalLastSyncedAt: {
              lt: new Date(now.getTime() - STALE_CALENDAR_HOURS * 3600_000),
            },
          },
        ],
      },
    }),
    prisma.payment.count({
      where: {
        status: PaymentStatus.FAILED,
        updatedAt: { gte: new Date(now.getTime() - 7 * MS_PER_DAY) },
      },
    }),
    // Refunds the provider rejected - flagged until an admin retries.
    prisma.booking.count({ where: { refundFailedAt: { not: null } } }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_BOOKINGS_LIMIT,
      select: {
        id: true,
        code: true,
        guestName: true,
        status: true,
        checkIn: true,
        nights: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        roomType: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        checkIn: {
          gte: today,
          lt: new Date(today.getTime() + UPCOMING_ARRIVALS_DAYS * MS_PER_DAY),
        },
      },
      orderBy: { checkIn: 'asc' },
      take: 10,
      select: {
        id: true,
        code: true,
        guestName: true,
        checkIn: true,
        nights: true,
        adults: true,
        children: true,
        roomType: { select: { name: true } },
        room: { select: { name: true } },
      },
    }),
  ]);

  // Occupancy for the range: occupied unit-nights / available unit-nights.
  const rangeNights = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  const availableNights = activeUnits * rangeNights;
  const occupiedNights =
    staysTouchingRange.reduce(
      (sum, stay) =>
        sum + overlapNights(stay.checkIn, stay.checkOut, start, end),
      0,
    ) +
    blocksTouchingRange.reduce(
      (sum, block) =>
        sum + overlapNights(block.startDate, block.endDate, start, end),
      0,
    );

  // Revenue + breakdowns for the range.
  const revenueTotal = revenueBookings.reduce(
    (sum, booking) => sum + booking.totalAmount,
    0,
  );
  const previousRevenue = previousRevenueBookings._sum.totalAmount ?? 0;

  const byRoomType = new Map<
    string,
    { name: string; revenue: number; bookings: number }
  >();
  const sources = { website: 0, manual: 0 };
  for (const booking of revenueBookings) {
    const entry = byRoomType.get(booking.roomTypeId) ?? {
      name: booking.roomType.name,
      revenue: 0,
      bookings: 0,
    };
    entry.revenue += booking.totalAmount;
    entry.bookings += 1;
    byRoomType.set(booking.roomTypeId, entry);
    if (booking.source === 'MANUAL') sources.manual += 1;
    else sources.website += 1;
  }

  // 12-month revenue series (confirmedAt month, oldest first).
  const monthly = new Map<string, { revenue: number; bookings: number }>();
  for (let i = 11; i >= 0; i--) {
    const month = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1),
    );
    monthly.set(month.toISOString().slice(0, 7), { revenue: 0, bookings: 0 });
  }
  for (const booking of last12moBookings) {
    if (!booking.confirmedAt) continue;
    const key = booking.confirmedAt.toISOString().slice(0, 7);
    const entry = monthly.get(key);
    if (!entry) continue;
    entry.revenue += booking.totalAmount;
    entry.bookings += 1;
  }

  const bookingsByStatus: Record<string, number> = {};
  for (const row of bookingsByStatusRaw) {
    bookingsByStatus[row.status] = row._count._all;
  }

  return {
    range: {
      preset,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    today: {
      arrivals: arrivalsToday,
      departures: departuresToday,
      inHouse,
      pendingHolds,
    },
    occupancy: {
      rate:
        availableNights > 0
          ? Math.round((occupiedNights / availableNights) * 1000) / 10
          : 0,
      occupiedNights,
      availableNights,
    },
    bookings: {
      count: createdInRange,
      trend: trendOf(createdInRange, createdInPrevious),
    },
    revenue: {
      total: revenueTotal,
      count: revenueBookings.length,
      average:
        revenueBookings.length > 0
          ? Math.round(revenueTotal / revenueBookings.length)
          : 0,
      trend: trendOf(revenueTotal, previousRevenue),
    },
    refunds: {
      total: refundsInRange._sum.amount ?? 0,
      count: refundsInRange._count._all,
    },
    revenueByMonth: Array.from(monthly, ([month, data]) => ({
      month,
      ...data,
    })),
    bookingsByStatus,
    topRoomTypes: Array.from(byRoomType, ([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    sources,
    needsAttention: {
      pendingReviews,
      pendingHolds,
      arrivalsDue: overdueArrivals,
      staleCalendars,
      failedPayments7d,
      failedRefunds,
    },
    recentBookings,
    upcomingArrivals,
  };
}

export type IDashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
