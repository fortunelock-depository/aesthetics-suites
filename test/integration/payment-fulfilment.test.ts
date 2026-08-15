// Settlement and fulfilment are two separate writes, and everything here
// is about the gap between them.
//
// The original bug: `confirmPayment` claimed the payment PENDING -> SUCCESS
// and then ran the booking side effects inside that same one-shot branch,
// swallowing any failure. If fulfilment died (DB blip, transaction budget,
// the function being killed) the booking stayed PENDING while the payment
// read SUCCESS - and because `confirmPayment` short-circuits on an
// already-SUCCESS payment, every webhook retry and guest revisit returned
// early without repairing it. The hold then lapsed, the unit was resold,
// and the return page still said "confirmed". Money taken, no stay, one log
// line.
//
// Three defences are asserted below: a retry re-drives fulfilment, the
// webhook answers 5xx so Paystack actually retries, and the housekeeping
// sweep heals anything nobody retried.
import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import prisma, { BookingStatus, PaymentStatus } from '@/lib/prisma';
import { confirmPayment } from '@/lib/payments/payment-service';
import {
  createWebsiteBooking,
  markBookingPaid,
  reconcileStrandedBookingPayments,
} from '@/lib/hotel/booking-service';
import { POST as webhookPost } from '@/app/api/payments/paystack/webhook/route';
import { POST as verifyPost } from '@/app/api/payments/verify/route';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

// Spy that passes through by default, so only the tests that ask for a
// failure get one.
vi.mock('@/lib/hotel/booking-service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/hotel/booking-service')>();
  return { ...actual, markBookingPaid: vi.fn(actual.markBookingPaid) };
});

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ 'x-real-ip': '203.0.113.9' })),
}));

vi.mock('@/lib/rate-limit', () => ({
  ratelimit: {
    limit: () =>
      Promise.resolve({ success: true, reset: 0, remaining: 5, limit: 5 }),
  },
  browseRatelimit: {
    limit: () =>
      Promise.resolve({ success: true, reset: 0, remaining: 60, limit: 60 }),
  },
}));

async function bookAndGetPayment(slug: string) {
  const result = await createWebsiteBooking(
    guestInput(slug, futureDate(10), futureDate(12)),
  );
  const payment = await prisma.payment.findFirstOrThrow({
    where: { purpose: 'BOOKING', purposeId: result.booking.id },
  });
  return { booking: result.booking, payment };
}

/** Settles the charge with fulfilment failing exactly once - the gap. */
async function settleWithFulfilmentFailure(reference: string) {
  vi.mocked(markBookingPaid).mockRejectedValueOnce(
    new Error('simulated fulfilment failure'),
  );
  // The guest-facing path swallows it (they paid; do not show a failure).
  await confirmPayment(reference);
}

const sign = (body: string) =>
  crypto.createHmac('sha512', 'sk_test_vitest').update(body).digest('hex');

describe('fulfilment failure after a settled payment', () => {
  it('leaves the payment settled but the booking unconfirmed', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetPayment(roomType.slug);

    await settleWithFulfilmentFailure(payment.reference);

    const settled = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    const stranded = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(settled.status).toBe(PaymentStatus.SUCCESS);
    expect(stranded.status).toBe(BookingStatus.PENDING);
  });

  it('is repaired by the next retry, even though the payment already reads SUCCESS', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetPayment(roomType.slug);

    await settleWithFulfilmentFailure(payment.reference);

    // Pre-fix this returned early on the SUCCESS short-circuit and the
    // booking stayed PENDING forever.
    await confirmPayment(payment.reference);

    const repaired = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(repaired.status).toBe(BookingStatus.CONFIRMED);
  });

  it('tells the guest "processing", never "confirmed", while it is stranded', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetPayment(roomType.slug);

    await settleWithFulfilmentFailure(payment.reference);

    // Fail the repair this call would otherwise do, so the response is
    // built against the genuinely stranded state.
    vi.mocked(markBookingPaid).mockRejectedValueOnce(new Error('still down'));
    const res = await verifyPost(
      new Request('http://localhost/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: payment.reference }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    const body = (await res.json()) as {
      data: { status: string; outcome: string };
    };

    expect(res.status).toBe(200);
    expect(body.data.status).toBe(PaymentStatus.SUCCESS);
    expect(body.data.outcome).toBe('processing');
  });

  it('makes the webhook answer 5xx so Paystack retries the event', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetPayment(roomType.slug);

    vi.mocked(markBookingPaid).mockRejectedValueOnce(
      new Error('simulated fulfilment failure'),
    );
    const event = JSON.stringify({
      event: 'charge.success',
      data: { reference: payment.reference },
    });
    const res = await webhookPost(
      new Request('http://localhost/api/payments/paystack/webhook', {
        method: 'POST',
        body: event,
        headers: { 'x-paystack-signature': sign(event) },
      }),
    );

    // A 200 here would tell Paystack the event was handled and it would
    // never retry - the guest's booking would stay stranded.
    expect(res.status).toBe(500);
  });
});

describe('reconcileStrandedBookingPayments', () => {
  it('confirms a paid booking that was left PENDING', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetPayment(roomType.slug);
    await settleWithFulfilmentFailure(payment.reference);

    const repaired = await reconcileStrandedBookingPayments();

    expect(repaired).toBeGreaterThanOrEqual(1);
    const healed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(healed.status).toBe(BookingStatus.CONFIRMED);
  });

  it('rescues a paid booking whose hold already lapsed into EXPIRED', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetPayment(roomType.slug);
    await settleWithFulfilmentFailure(payment.reference);

    // The sweep that would have run before anyone noticed.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.EXPIRED, holdExpiresAt: new Date(0) },
    });

    await reconcileStrandedBookingPayments();

    // The unit is still free, so reconciliation reseats rather than refunds.
    const healed = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(healed.status).toBe(BookingStatus.CONFIRMED);
  });

  it('leaves healthy bookings alone', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetPayment(roomType.slug);
    await confirmPayment(payment.reference);

    expect(await reconcileStrandedBookingPayments()).toBe(0);
  });
});
