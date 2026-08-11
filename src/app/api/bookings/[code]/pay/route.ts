// src/app/api/bookings/[code]/pay/route.ts
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma, { BookingStatus } from '@/lib/prisma';
import { initializePayment } from '@/lib/payments/payment-service';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';

const paySchema = z.object({ email: z.email() });

/**
 * Resume payment for a PENDING booking (guest closed the Paystack page,
 * card declined, ...). Code + email is the identity; the payment rail
 * reuses the live PENDING charge, so no duplicate transaction can open.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const { success } = await ratelimit.limit(`booking-pay:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const { code } = await params;
    const { email } = paySchema.parse(await req.json());

    const booking = await prisma.booking.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        guestEmail: email.toLowerCase().trim(),
      },
      select: {
        id: true,
        code: true,
        status: true,
        holdExpiresAt: true,
        totalAmount: true,
        currency: true,
        guestName: true,
        guestEmail: true,
      },
    });
    if (!booking) throw new NotFoundError('Booking not found');

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictError(
        booking.status === BookingStatus.CONFIRMED
          ? 'This booking is already paid and confirmed.'
          : 'This booking can no longer be paid - please make a new booking.',
      );
    }
    if (
      booking.holdExpiresAt &&
      booking.holdExpiresAt.getTime() < Date.now()
    ) {
      throw new ConflictError(
        'The hold on this booking has expired - please make a new booking.',
      );
    }

    const payment = await initializePayment({
      amount: booking.totalAmount,
      currency: booking.currency,
      purpose: 'BOOKING',
      purposeId: booking.id,
      customerEmail: booking.guestEmail,
      customerName: booking.guestName,
    });

    return successResponse(
      {
        code: booking.code,
        authorizationUrl: payment.authorizationUrl,
        reference: payment.reference,
      },
      'Payment resumed - complete it to confirm your stay.',
    );
  } catch (err) {
    return handleApiError(err);
  }
}
