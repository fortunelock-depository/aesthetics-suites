// src/app/api/admin/bookings/[id]/refund/route.ts
import { requireAdmin } from '@/lib/api-auth';
import { refundCancelledBooking } from '@/lib/hotel/booking-service';
import { successResponse, handleApiError } from '@/utils/api-response';

/**
 * Admin retry/late refund for a CANCELLED booking: re-drives a refund
 * Paystack rejected (refundFailedAt set), or refunds a settled payment on
 * a booking cancelled without one (dispute resolution, goodwill). Admin
 * only - this moves real money.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const result = await refundCancelledBooking(id);
    return successResponse(result, 'Refund executed');
  } catch (err) {
    return handleApiError(err);
  }
}
