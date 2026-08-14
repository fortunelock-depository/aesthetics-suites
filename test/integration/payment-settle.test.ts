// Payment settlement: idempotent claims, mismatch refusal, PENDING-charge
// reuse, the REVERSED terminal guard, the CRITICAL-2 reconcile branches
// (reseat vs auto-refund), and the webhook route's signature gate.
import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import prisma, { BookingStatus, PaymentStatus } from '@/lib/prisma';
import {
  confirmPayment,
  initializePayment,
  reversePayment,
} from '@/lib/payments/payment-service';
import { createWebsiteBooking } from '@/lib/hotel/booking-service';
import {
  refundPaystackTransaction,
  verifyPaystackTransaction,
} from '@/lib/paystack/client';
import {
  sendBookingConfirmedEmail,
  sendPaymentReconciliationAlert,
} from '@/lib/mail/booking-emails';
import { POST as webhookPost } from '@/app/api/payments/paystack/webhook/route';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

async function bookAndGetReference(slug: string, email = 'guest@test.local') {
  const result = await createWebsiteBooking(
    guestInput(slug, futureDate(10), futureDate(12), { guestEmail: email }),
  );
  const payment = await prisma.payment.findFirstOrThrow({
    where: { purpose: 'BOOKING', purposeId: result.booking.id },
  });
  return { booking: result.booking, payment };
}

const sign = (body: string) =>
  crypto.createHmac('sha512', 'sk_test_vitest').update(body).digest('hex');

const webhookRequest = (body: string, signature?: string) =>
  new Request('http://localhost/api/payments/paystack/webhook', {
    method: 'POST',
    body,
    headers: signature ? { 'x-paystack-signature': signature } : {},
  });

describe('confirmPayment', () => {
  it('settles a live hold: payment SUCCESS, booking CONFIRMED, emails sent once', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    await confirmPayment(payment.reference);

    const settled = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(settled.status).toBe(PaymentStatus.SUCCESS);
    expect(settled.paidAt).not.toBeNull();

    const confirmed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
    expect(confirmed.holdExpiresAt).toBeNull();
    expect(vi.mocked(sendBookingConfirmedEmail)).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a second settle credits nothing and re-sends nothing', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);

    await confirmPayment(payment.reference);
    const again = await confirmPayment(payment.reference);
    expect(again.status).toBe(PaymentStatus.SUCCESS);
    expect(vi.mocked(sendBookingConfirmedEmail)).toHaveBeenCalledTimes(1);
  });

  it('refuses an amount mismatch and leaves the payment PENDING', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    vi.mocked(verifyPaystackTransaction).mockResolvedValueOnce({
      status: 'success',
      amount: 1,
      currency: 'GHS',
      reference: payment.reference,
      paidAt: new Date().toISOString(),
      channel: 'card',
      customerEmail: null,
    });

    await expect(confirmPayment(payment.reference)).rejects.toThrow(
      /could not be reconciled/,
    );
    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(untouched.status).toBe(PaymentStatus.PENDING);
    const still = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(still.status).toBe(BookingStatus.PENDING);
  });

  it('leaves an unpaid verify PENDING so a later webhook can still settle', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);

    vi.mocked(verifyPaystackTransaction).mockResolvedValueOnce({
      status: 'abandoned',
      amount: payment.amount,
      currency: 'GHS',
      reference: payment.reference,
      paidAt: null,
      channel: null,
      customerEmail: null,
    });
    await expect(confirmPayment(payment.reference)).rejects.toThrow(
      /not been completed/,
    );
    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(untouched.status).toBe(PaymentStatus.PENDING);
  });

  it('REVERSED is terminal: a replayed success never resurrects a refund', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);

    await confirmPayment(payment.reference);
    const reversal = await reversePayment(payment.id);
    expect(reversal?.refunded).toBe(true);

    await expect(confirmPayment(payment.reference)).rejects.toThrow(
      /no longer be confirmed/,
    );
    const final = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(final.status).toBe(PaymentStatus.REVERSED);
  });
});

describe('initializePayment', () => {
  it('reuses a live PENDING charge instead of opening a second one', async () => {
    const input = {
      amount: 55_000,
      purpose: 'BOOKING',
      purposeId: 'reuse-test',
      customerEmail: 'reuse@test.local',
    };
    const first = await initializePayment(input);
    const second = await initializePayment(input);
    expect(second.reference).toBe(first.reference);
    expect(
      await prisma.payment.count({ where: { purposeId: 'reuse-test' } }),
    ).toBe(1);
  });
});

describe('CRITICAL-2 reconcile: payment settles after the hold lapsed', () => {
  it('reseats the booking when its unit is still free', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    // Hold lapses, nobody takes the unit.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });

    await confirmPayment(payment.reference);

    const resurrected = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(resurrected.status).toBe(BookingStatus.CONFIRMED);
    expect(resurrected.roomId).toBe(booking.roomId);
    expect(vi.mocked(sendBookingConfirmedEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendPaymentReconciliationAlert)).not.toHaveBeenCalled();
  });

  it('auto-refunds and pages staff when the dates were resold', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    // Hold lapses; a second guest books the same dates (sweeps the lapsed
    // hold inline and takes the only unit).
    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });
    const rival = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'rival@test.local',
      }),
    );
    expect(rival.booking.roomId).toBe(booking.roomId);

    // The slow mobile-money approval lands now.
    await confirmPayment(payment.reference);

    const dead = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(dead.status).toBe(BookingStatus.EXPIRED);
    expect(dead.refundedAmount).toBe(payment.amount);
    expect(dead.refundFailedAt).toBeNull();

    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    expect(vi.mocked(refundPaystackTransaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendPaymentReconciliationAlert)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendBookingConfirmedEmail)).not.toHaveBeenCalled();
  });

  it('flags refundFailedAt when the auto-refund is rejected by Paystack', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });
    await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'rival2@test.local',
      }),
    );

    vi.mocked(refundPaystackTransaction).mockRejectedValueOnce(
      new Error('insufficient payout balance'),
    );
    await confirmPayment(payment.reference);

    const flagged = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(flagged.refundFailedAt).not.toBeNull();
    expect(flagged.refundedAmount).toBe(0);

    // The reversal claim itself stuck (conservative direction).
    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
  });
});

describe('Paystack webhook route', () => {
  it('rejects a bad signature and settles nothing', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: payment.reference },
    });

    const bad = await webhookPost(webhookRequest(body, sign(body + 'tamper')));
    expect(bad.status).toBe(401);
    const missing = await webhookPost(webhookRequest(body));
    expect(missing.status).toBe(401);

    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(untouched.status).toBe(PaymentStatus.PENDING);
  });

  it('settles on a valid signature; a replay is acknowledged without recrediting', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: payment.reference },
    });

    const first = await webhookPost(webhookRequest(body, sign(body)));
    expect(first.status).toBe(200);
    const replay = await webhookPost(webhookRequest(body, sign(body)));
    expect(replay.status).toBe(200);

    const confirmed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
    expect(vi.mocked(sendBookingConfirmedEmail)).toHaveBeenCalledTimes(1);
  });

  it('acknowledges permanent failures so Paystack stops retrying', async () => {
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'AS-UNKNOWN-REFERENCE' },
    });
    const response = await webhookPost(webhookRequest(body, sign(body)));
    expect(response.status).toBe(200);
  });
});
