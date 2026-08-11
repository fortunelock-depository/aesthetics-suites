// src/app/api/bookings/route.ts
import { headers } from 'next/headers';
import { createWebsiteBooking } from '@/lib/hotel/booking-service';
import { bookingCreateSchema } from '@/validations/hotel-validation';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import { TooManyRequestsError } from '@/middlewares/error-handler';

/**
 * Public booking checkout: validates the stay, quotes server-side, holds a
 * unit and returns the Paystack authorization URL to redirect the guest to.
 */
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const { success } = await ratelimit.limit(`booking:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const input = bookingCreateSchema.parse(await req.json());

    // Honeypot filled: pretend success, create nothing.
    if (input.website) {
      return successResponse({ code: null, authorizationUrl: null });
    }

    const { booking, authorizationUrl, reference } =
      await createWebsiteBooking(input);

    return successResponse(
      {
        code: booking.code,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        holdExpiresAt: booking.holdExpiresAt,
        authorizationUrl,
        reference,
      },
      'Booking held - complete payment to confirm.',
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
