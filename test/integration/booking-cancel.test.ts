// Cancellation policy and refunds: free-window vs late cancels, the
// guest-facing status restriction, the refund-failure flag, the admin
// retry path, and double-cancel protection.
import { describe, expect, it, vi } from 'vitest';
import prisma, { BookingStatus, PaymentStatus } from '@/lib/prisma';
import {
  cancelBookingAsGuest,
  cancelBookingWithPolicy,
  createWebsiteBooking,
  refundCancelledBooking,
} from '@/lib/hotel/booking-service';
import { confirmPayment } from '@/lib/payments/payment-service';
import { refundPaystackTransaction } from '@/lib/paystack/client';
import { sendBookingCancelledEmail } from '@/lib/mail/booking-emails';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

/** A paid, CONFIRMED booking with its settled payment. */
async function paidBooking(options: { freeCancellationDays?: number } = {}) {
  const { roomType } = await createRoomTypeWithUnits(options);
  const result = await createWebsiteBooking(
    guestInput(roomType.slug, futureDate(10), futureDate(12)),
  );
  const payment = await prisma.payment.findFirstOrThrow({
    where: { purpose: 'BOOKING', purposeId: result.booking.id },
  });
  await confirmPayment(payment.reference);
  return { booking: result.booking, payment };
}

describe('cancelBookingWithPolicy', () => {
  it('refunds in full inside the free-cancellation window', async () => {
    const { booking, payment } = await paidBooking({ freeCancellationDays: 2 });

    const result = await cancelBookingWithPolicy(booking.id);
    expect(result.refunded).toBe(true);
    expect(result.refundedAmount).toBe(payment.amount);
    expect(result.refundFailed).toBe(false);

    const cancelled = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(cancelled.status).toBe(BookingStatus.CANCELLED);
    expect(cancelled.refundedAmount).toBe(payment.amount);
    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    expect(vi.mocked(sendBookingCancelledEmail)).toHaveBeenCalledTimes(1);
  });

  it('refunds nothing outside the window (check-in 10 days out, window 30)', async () => {
    const { booking, payment } = await paidBooking({
      freeCancellationDays: 30,
    });

    const result = await cancelBookingWithPolicy(booking.id);
    expect(result.refunded).toBe(false);
    expect(result.refundedAmount).toBe(0);

    const kept = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(kept.status).toBe(PaymentStatus.SUCCESS);
    expect(vi.mocked(refundPaystackTransaction)).not.toHaveBeenCalled();
  });

  it('refundOverride forces a refund outside the window and stamps the actor', async () => {
    const { booking, payment } = await paidBooking({
      freeCancellationDays: 30,
    });
    const actor = await prisma.user.create({
      data: {
        email: 'admin-cancel@test.local',
        password: 'not-a-real-hash',
        fullname: 'Admin',
      },
    });

    const result = await cancelBookingWithPolicy(booking.id, {
      refundOverride: true,
      actorId: actor.id,
    });
    expect(result.refunded).toBe(true);
    expect(result.refundedAmount).toBe(payment.amount);

    const cancelled = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(cancelled.cancelledById).toBe(actor.id);
  });

  it('flags refundFailedAt (and keeps refundedAmount at 0) when Paystack rejects', async () => {
    const { booking } = await paidBooking({ freeCancellationDays: 2 });

    vi.mocked(refundPaystackTransaction).mockRejectedValueOnce(
      new Error('provider rejected'),
    );
    const result = await cancelBookingWithPolicy(booking.id);
    expect(result.refundFailed).toBe(true);
    expect(result.refundedAmount).toBe(0);

    const flagged = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(flagged.refundFailedAt).not.toBeNull();
    expect(flagged.refundedAmount).toBe(0);
  });

  it('a second cancel is refused', async () => {
    const { booking } = await paidBooking();
    await cancelBookingWithPolicy(booking.id);
    await expect(cancelBookingWithPolicy(booking.id)).rejects.toThrow(
      /Cannot cancel a CANCELLED booking/,
    );
  });
});

describe('refundCancelledBooking (admin retry)', () => {
  it('re-drives a refund the provider rejected', async () => {
    const { booking, payment } = await paidBooking({ freeCancellationDays: 2 });
    vi.mocked(refundPaystackTransaction).mockRejectedValueOnce(
      new Error('provider rejected'),
    );
    await cancelBookingWithPolicy(booking.id);

    const retry = await refundCancelledBooking(booking.id);
    expect(retry.refundedAmount).toBe(payment.amount);

    const healed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(healed.refundedAmount).toBe(payment.amount);
    expect(healed.refundFailedAt).toBeNull();
  });

  it('refunds a booking cancelled without one (goodwill / dispute)', async () => {
    const { booking, payment } = await paidBooking({
      freeCancellationDays: 30,
    });
    await cancelBookingWithPolicy(booking.id); // outside window: no refund

    const late = await refundCancelledBooking(booking.id);
    expect(late.refundedAmount).toBe(payment.amount);
    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
  });

  it('refuses non-cancelled and already-refunded bookings', async () => {
    const { booking } = await paidBooking();
    await expect(refundCancelledBooking(booking.id)).rejects.toThrow(
      /Only cancelled bookings/,
    );

    await cancelBookingWithPolicy(booking.id); // refunds (inside window)
    await expect(refundCancelledBooking(booking.id)).rejects.toThrow(
      /already been refunded/,
    );
  });
});

describe('cancelBookingAsGuest', () => {
  it('cancels PENDING/CONFIRMED stays via code + matching email only', async () => {
    const { booking } = await paidBooking();
    await expect(
      cancelBookingAsGuest(booking.code, 'wrong@test.local'),
    ).rejects.toThrow(/not found/);

    const result = await cancelBookingAsGuest(booking.code, booking.guestEmail);
    expect(result.booking.status).toBe(BookingStatus.CANCELLED);
  });

  it('refuses to cancel an in-house (CHECKED_IN) stay', async () => {
    const { booking } = await paidBooking();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CHECKED_IN, checkedInAt: new Date() },
    });
    await expect(
      cancelBookingAsGuest(booking.code, booking.guestEmail),
    ).rejects.toThrow(/no longer be cancelled online/);
  });
});
