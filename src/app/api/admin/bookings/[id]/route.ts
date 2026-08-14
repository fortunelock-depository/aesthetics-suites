// src/app/api/admin/bookings/[id]/route.ts
import prisma, { UserRole } from '@/lib/prisma';
import { requireStaff } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { bookingActionSchema } from '@/validations/hotel-validation';
import {
  applyBookingAction,
  cancelBookingWithPolicy,
} from '@/lib/hotel/booking-service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaff();
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        roomType: { select: { id: true, name: true, slug: true } },
        room: { select: { id: true, name: true } },
        discount: { select: { id: true, name: true, code: true } },
      },
    });
    if (!booking) throw new NotFoundError('Booking not found');

    const payments = await prisma.payment.findMany({
      where: { purpose: 'BOOKING', purposeId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        status: true,
        amount: true,
        currency: true,
        channel: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return successResponse({ ...booking, payments });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Status transitions: confirm / cancel / check_in / check_out / no_show.
 * Guarded server-side so an impossible transition 409s instead of
 * corrupting the calendar.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    const { id } = await params;
    const { action, reason, refund } = bookingActionSchema.parse(
      await req.json(),
    );

    if (action === 'cancel') {
      // Forcing a refund on/off overrides the cancellation policy - that
      // is a money decision, so FRONT_DESK cancels only ever follow policy.
      if (refund !== undefined && session.role === UserRole.FRONT_DESK) {
        throw new ForbiddenError(
          'Only admins can override the refund policy.',
        );
      }
      const result = await cancelBookingWithPolicy(id, {
        reason,
        refundOverride: refund,
        actorId: session.userId,
      });
      return successResponse(
        result,
        result.refunded
          ? 'Booking cancelled and refunded'
          : result.refundFailed
            ? 'Booking cancelled - the refund FAILED at Paystack and is flagged for retry'
            : 'Booking cancelled (no refund)',
      );
    }

    const booking = await applyBookingAction(
      id,
      action,
      reason,
      session.userId,
    );
    return successResponse(booking, `Booking ${action.replace('_', ' ')} done`);
  } catch (err) {
    return handleApiError(err);
  }
}
