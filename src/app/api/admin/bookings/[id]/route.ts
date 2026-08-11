// src/app/api/admin/bookings/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { bookingActionSchema } from '@/validations/hotel-validation';
import {
  applyBookingAction,
  cancelBookingWithPolicy,
} from '@/lib/hotel/booking-service';
import { NotFoundError } from '@/middlewares/error-handler';

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
    await requireStaff();
    const { id } = await params;
    const { action, reason, refund } = bookingActionSchema.parse(
      await req.json(),
    );

    if (action === 'cancel') {
      const result = await cancelBookingWithPolicy(id, {
        reason,
        refundOverride: refund,
      });
      return successResponse(
        result,
        result.refunded
          ? 'Booking cancelled and refunded'
          : 'Booking cancelled (no refund)',
      );
    }

    const booking = await applyBookingAction(id, action, reason);
    return successResponse(booking, `Booking ${action.replace('_', ' ')} done`);
  } catch (err) {
    return handleApiError(err);
  }
}
