// src/app/api/rooms/[slug]/availability/route.ts
import type { NextRequest } from 'next/server';
import { quoteStay } from '@/lib/hotel/booking-service';
import { availabilityQuerySchema } from '@/validations/hotel-validation';
import { successResponse, handleApiError } from '@/utils/api-response';

/**
 * Public availability + price quote for a stay: the source of truth the
 * booking form displays (never trust a client-computed total).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const query = availabilityQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const { quote, availability } = await quoteStay({
      roomTypeSlug: slug,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      adults: query.adults,
      children: query.children,
      discountCode: query.discountCode,
    });

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
