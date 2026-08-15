// src/app/api/rooms/[slug]/availability/route.ts
import { after, type NextRequest } from 'next/server';
import { quoteStay } from '@/lib/hotel/booking-service';
import {
  BROWSE_FETCH_TIMEOUT_MS,
  BROWSE_STALE_MS,
  refreshStaleCalendars,
} from '@/lib/hotel/ical';
import { availabilityQuerySchema } from '@/validations/hotel-validation';
import { successResponse, handleApiError } from '@/utils/api-response';
import { browseRatelimit } from '@/lib/rate-limit';
import { clientIp } from '@/utils/client-ip';
import { TooManyRequestsError } from '@/lib/errors';

/**
 * Public availability + price quote for a stay: the source of truth the
 * booking form displays (never trust a client-computed total).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // The most expensive public read (a quote spans room type, season
    // rates, discounts, bookings and calendar blocks) and the trigger for
    // the on-demand Airbnb refresh below, so it must not be free to flood.
    const { success } = await browseRatelimit.limit(
      `availability:${clientIp(req.headers)}`,
    );
    if (!success) throw new TooManyRequestsError();

    const { slug } = await params;
    const query = availabilityQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const { roomType, quote, availability } = await quoteStay({
      roomTypeSlug: slug,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      adults: query.adults,
      children: query.children,
      discountCode: query.discountCode,
    });

    // Somebody is looking at dates for THIS room, so warm its calendars for
    // whoever looks next (and for their own booking submit, which syncs on
    // a much tighter threshold). After the response, so nobody waits on an
    // Airbnb fetch; the claim inside makes concurrent probes fetch once.
    after(() =>
      refreshStaleCalendars(roomType.id, {
        maxAgeMs: BROWSE_STALE_MS,
        timeoutMs: BROWSE_FETCH_TIMEOUT_MS,
      }),
    );

    return successResponse({
      available: availability.availableUnits > 0,
      availableUnits: availability.availableUnits,
      nights: quote.nights,
      baseAmount: quote.baseAmount,
      occupancyAmount: quote.occupancyAmount,
      discountAmount: quote.discountAmount,
      taxLines: quote.taxLines,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      minNights: quote.minNights,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
