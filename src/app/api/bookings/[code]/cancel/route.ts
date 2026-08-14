// src/app/api/bookings/[code]/cancel/route.ts
import { headers } from 'next/headers';
import { clientIp } from '@/utils/client-ip';
import { z } from 'zod';
import { cancelBookingAsGuest } from '@/lib/hotel/booking-service';
import { successResponse, handleApiError } from '@/utils/api-response';
import { ratelimit } from '@/lib/rate-limit';
import { TooManyRequestsError } from '@/lib/errors';

const cancelSchema = z.object({ email: z.email() });

/**
 * Guest cancellation (code + email as identity). The room type's
 * free-cancellation policy decides the refund: full via Paystack inside the
 * window, none outside it. The response says which happened.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const headersList = await headers();
    const ip = clientIp(headersList);
    const { success } = await ratelimit.limit(`cancel:${ip}`);
    if (!success) throw new TooManyRequestsError();

    const { code } = await params;
    const { email } = cancelSchema.parse(await req.json());

    const result = await cancelBookingAsGuest(code, email);

    return successResponse(
      {
        code: result.booking.code,
        status: result.booking.status,
        refunded: result.refunded,
        refundedAmount: result.refundedAmount,
      },
      result.refunded
        ? 'Booking cancelled - your refund is on its way.'
        : result.refundFailed
          ? 'Booking cancelled - your refund is being handled by our team and we will follow up shortly.'
          : 'Booking cancelled. No refund applies outside the free-cancellation window.',
    );
  } catch (err) {
    return handleApiError(err);
  }
}
