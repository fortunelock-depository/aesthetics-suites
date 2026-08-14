// src/app/api/admin/bookings/route.ts
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/lib/prisma';
import prisma, { UserRole } from '@/lib/prisma';
import { requireStaff } from '@/lib/api-auth';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import {
  bookingsQuerySchema,
  manualBookingSchema,
} from '@/validations/hotel-validation';
import { createManualBooking } from '@/lib/hotel/booking-service';
import { parseDateOnly } from '@/lib/hotel/dates';
import { ForbiddenError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const query = bookingsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.BookingWhereInput = {
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { guestName: { contains: query.search, mode: 'insensitive' } },
              { guestEmail: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.roomTypeId ? { roomTypeId: query.roomTypeId } : {}),
      // Stays overlapping [from, to) - half-open like everything else.
      ...(query.from ? { checkOut: { gt: parseDateOnly(query.from) } } : {}),
      ...(query.to ? { checkIn: { lt: parseDateOnly(query.to) } } : {}),
    };

    const [bookings, totalItems] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          roomType: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return paginatedResponse(bookings, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Walk-in / phone booking, created CONFIRMED (no online payment). */
export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const input = manualBookingSchema.parse(await req.json());
    // Price overrides move real money off the list price - admin only.
    if (
      input.totalOverride !== undefined &&
      session.role === UserRole.FRONT_DESK
    ) {
      throw new ForbiddenError('Only admins can override the booking total.');
    }
    const booking = await createManualBooking(input, session.userId);
    return successResponse(booking, 'Booking created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
