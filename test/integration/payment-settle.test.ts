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
import { POST as verifyPost } from '@/app/api/payments/verify/route';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

// The verify route reads the caller IP for rate limiting; outside a request
// context `headers()` throws, so it is stubbed here.
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers({ 'x-real-ip': '203.0.113.7' })),
}));

// The in-memory limiter counts per worker, so several route calls in one
// file would trip it. Limiter selection and windows have their own unit
// tests (src/lib/rate-limiter.test.ts); this file is about outcomes.
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: {
    limit: () =>
      Promise.resolve({ success: true, reset: 0, remaining: 5, limit: 5 }),
  },
}));

interface IVerifyBody {
  data: {
    status: string;
    outcome: string;
    booking: { code: string; refunded: boolean; refundFailed: boolean } | null;
  };
}

const verifyViaRoute = async (reference: string) => {
  const res = await verifyPost(
    new Request('http://localhost/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference }),
      headers: { 'content-type': 'application/json' },
    }),
  );
  return { status: res.status, body: (await res.json()) as IVerifyBody };
};

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

  it('survives a webhook and a verify racing the same charge: one credit', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    // The guest lands back on the return page at the same moment Paystack
    // posts the webhook. Both call confirmPayment; the guarded claim must
    // pick exactly one winner.
    const results = await Promise.allSettled([
      confirmPayment(payment.reference),
      confirmPayment(payment.reference),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

    const settled = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(settled.status).toBe(PaymentStatus.SUCCESS);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe(BookingStatus.CONFIRMED);
    // One credit, one confirmation - the race must not double either.
    expect(
      await prisma.payment.count({
        where: { purposeId: booking.id, status: PaymentStatus.SUCCESS },
      }),
    ).toBe(1);
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

  it('refuses a currency mismatch and leaves the payment PENDING', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    // Right amount, wrong currency: 120000 NGN is not 120000 GHS, and a
    // reconciliation that only compared amounts would credit it.
    vi.mocked(verifyPaystackTransaction).mockResolvedValueOnce({
      status: 'success',
      amount: payment.amount,
      currency: 'NGN',
      reference: payment.reference,
      paidAt: new Date().toISOString(),
      channel: 'card',
      customerEmail: null,
    });

    await expect(confirmPayment(payment.reference)).rejects.toThrow(
      /could not be reconciled/,
    );
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
    ).toBe(PaymentStatus.PENDING);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe(BookingStatus.PENDING);
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
  // What this pins: the reconcile path's OUTCOME. A status-only claim would
  // confirm this booking too, so this case does not discriminate - the
  // auto-refund case below is what does. Its value is proving that a lapsed
  // hold whose unit is still free is reseated rather than refunded, and that
  // the reconcile branch fires at all (the sweep would otherwise have
  // expired it out from under the payment).
  it('reseats the booking when its unit is still free', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    // Hold lapses, nobody takes the unit.
    const lapsedAt = new Date(Date.now() - 60_000);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: lapsedAt },
    });

    // The hold really was dead before the money landed: the claim in
    // markBookingPaid requires a LIVE hold, so settlement here can only
    // have gone through reconcileLatePayment.
    const beforeSettle = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(beforeSettle.holdExpiresAt!.getTime()).toBeLessThan(Date.now());
    expect(beforeSettle.status).toBe(BookingStatus.PENDING);

    await confirmPayment(payment.reference);

    const resurrected = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(resurrected.status).toBe(BookingStatus.CONFIRMED);
    expect(resurrected.roomId).toBe(booking.roomId);
    // Reseated, so the guest keeps their money and their room.
    expect(resurrected.refundedAmount).toBe(0);
    expect(resurrected.refundFailedAt).toBeNull();
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
    ).toBe(PaymentStatus.SUCCESS);
    expect(vi.mocked(refundPaystackTransaction)).not.toHaveBeenCalled();
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

// The return page branches on `outcome` alone. Branching on payment status
// instead tells a guest whose room was resold that their payment "was not
// confirmed", when the money has arrived and a refund is already in flight.
describe('verify route outcome', () => {
  it('reports confirmed for a normal settle', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    const { status, body } = await verifyViaRoute(payment.reference);

    expect(status).toBe(200);
    expect(body.data.outcome).toBe('confirmed');
    expect(body.data.status).toBe(PaymentStatus.SUCCESS);
    expect(body.data.booking?.code).toBe(booking.code);
    expect(body.data.booking?.refunded).toBe(false);
  });

  it('reports refunded when the room was resold and the refund went through', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });
    await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'rival3@test.local',
      }),
    );

    const { status, body } = await verifyViaRoute(payment.reference);

    expect(status).toBe(200);
    // The payment row is REVERSED by now - the outcome, not the status, is
    // what the guest is shown.
    expect(body.data.status).toBe(PaymentStatus.REVERSED);
    expect(body.data.outcome).toBe('refunded');
    expect(body.data.booking?.refunded).toBe(true);
    expect(body.data.booking?.refundFailed).toBe(false);
  });

  it('reports refund_pending when the auto-refund was rejected', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });
    await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'rival4@test.local',
      }),
    );
    vi.mocked(refundPaystackTransaction).mockRejectedValueOnce(
      new Error('insufficient payout balance'),
    );

    const { status, body } = await verifyViaRoute(payment.reference);

    expect(status).toBe(200);
    expect(body.data.outcome).toBe('refund_pending');
    expect(body.data.booking?.refunded).toBe(false);
    expect(body.data.booking?.refundFailed).toBe(true);
  });

  it('keeps telling the truth when the guest revisits the return page', async () => {
    const { roomType } = await createRoomTypeWithUnits({ units: 1 });
    const { booking, payment } = await bookAndGetReference(roomType.slug);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });
    await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(10), futureDate(12), {
        guestEmail: 'rival5@test.local',
      }),
    );

    await verifyViaRoute(payment.reference);
    // A refresh: confirmPayment now refuses (REVERSED is terminal), which
    // must not degrade into "payment not confirmed".
    const { status, body } = await verifyViaRoute(payment.reference);

    expect(status).toBe(200);
    expect(body.data.outcome).toBe('refunded');
  });
});

describe('provider-side refunds (refund.processed webhook)', () => {
  // A refund executed on the Paystack dashboard never passes through
  // reversePayment. Without this handler the ledger keeps reading SUCCESS
  // while the money has gone back: the room stays blocked for a stay
  // nobody paid for, and revenue is overstated by the refunded amount.
  const refundEvent = (reference: string, amount?: number) =>
    JSON.stringify({
      event: 'refund.processed',
      data: { transaction_reference: reference, ...(amount ? { amount } : {}) },
    });

  it('reverses the ledger row and records the refund on the booking', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking, payment } = await bookAndGetReference(roomType.slug);
    await confirmPayment(payment.reference);

    const body = refundEvent(payment.reference, payment.amount);
    const res = await webhookPost(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);

    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    expect(reversed.reversedAt).not.toBeNull();

    const row = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(row.refundedAmount).toBe(payment.amount);
  });

  it('is idempotent: a replayed event changes nothing', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);
    await confirmPayment(payment.reference);

    const body = refundEvent(payment.reference, payment.amount);
    await webhookPost(webhookRequest(body, sign(body)));
    const first = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });

    const res = await webhookPost(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);

    const second = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(second.reversedAt).toEqual(first.reversedAt);
  });

  it('does NOT reverse the whole charge on a partial refund', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { payment } = await bookAndGetReference(roomType.slug);
    await confirmPayment(payment.reference);

    // Half the money back: flipping the row REVERSED would overstate the
    // reversal, so this pages for a manual adjustment instead.
    const body = refundEvent(payment.reference, Math.floor(payment.amount / 2));
    const res = await webhookPost(webhookRequest(body, sign(body)));
    expect(res.status).toBe(200);

    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(untouched.status).toBe(PaymentStatus.SUCCESS);
  });
});
