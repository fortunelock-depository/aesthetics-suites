// src/app/api/admin/room-types/[id]/calendar/route.ts
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { calendarQuerySchema } from '@/validations/hotel-validation';
import { parseDateOnly } from '@/lib/hotel/dates';
import { BLOCKING_STATUSES } from '@/lib/hotel/availability';
import { BadRequestError, NotFoundError } from '@/middlewares/error-handler';

const MAX_RANGE_DAYS = 92; // ~3 months per request keeps payloads sane.

/**
 * Availability-calendar data for one room type: every unit with its
 * bookings and blocks overlapping [from, to). The UI paints the day grid
 * from these ranges (all half-open).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaff();
    const { id } = await params;
    const query = calendarQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const from = parseDateOnly(query.from);
    const to = parseDateOnly(query.to);
    const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    if (rangeDays < 1 || rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestError(
        `Range must be between 1 and ${MAX_RANGE_DAYS} days.`,
      );
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id },
      select: { id: true, name: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const units = await prisma.room.findMany({
      where: { roomTypeId: id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        icalLastSyncedAt: true,
        airbnbIcalUrl: true,
        bookings: {
          where: {
            status: { in: BLOCKING_STATUSES },
            checkIn: { lt: to },
            checkOut: { gt: from },
          },
          select: {
            id: true,
            code: true,
            guestName: true,
            status: true,
            checkIn: true,
            checkOut: true,
          },
        },
        blocks: {
          where: { startDate: { lt: to }, endDate: { gt: from } },
          select: {
            id: true,
            source: true,
            startDate: true,
            endDate: true,
            summary: true,
          },
        },
      },
    });

    return successResponse({
      roomType,
      from: query.from,
      to: query.to,
      units: units.map((unit) => ({
        ...unit,
        // Expose whether Airbnb sync is configured, never the URL itself.
        airbnbIcalUrl: undefined,
        airbnbSyncEnabled: Boolean(unit.airbnbIcalUrl),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
