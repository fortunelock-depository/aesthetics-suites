// src/app/api/bookings/[code]/route.ts
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import { clientIp } from '@/utils/client-ip';
import { NotFoundError, TooManyRequestsError } from '@/lib/errors';

const lookupSchema = z.object({ email: z.email() });

/**
 * Public booking lookup ("track my booking"): requires the booking code AND
 * the guest email, so a leaked code alone reveals nothing.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    // Same throttle as its cancel/pay siblings: booking codes carry only 3
    // random bytes, so an unlimited lookup would let a known guest email
    // grind codes for someone's stay dates.
    const { success } = await ratelimit.limit(
      `booking-lookup:${clientIp(req.headers)}`,
    );
    if (!success) throw new TooManyRequestsError();

    const { code } = await params;
    const { email } = lookupSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const booking = await prisma.booking.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        guestEmail: email.toLowerCase().trim(),
      },
      select: {
        code: true,
        status: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        adults: true,
        children: true,
        guestName: true,
        totalAmount: true,
        discountAmount: true,
        currency: true,
        holdExpiresAt: true,
        roomType: { select: { name: true, slug: true } },
      },
    });
    if (!booking) throw new NotFoundError('Booking not found');

    return successResponse(booking);
  } catch (err) {
    return handleApiError(err);
  }
}
