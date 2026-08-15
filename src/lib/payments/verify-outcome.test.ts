import { describe, expect, it } from 'vitest';
import { resolveVerifyOutcome } from './verify-outcome';

const booking = (over: Partial<Parameters<typeof resolveVerifyOutcome>[0]['booking'] & object> = {}) => ({
  status: 'CONFIRMED',
  refundedAmount: 0,
  refundFailedAt: null,
  ...over,
});

describe('resolveVerifyOutcome', () => {
  it('confirms a settled charge on a live booking', () => {
    expect(
      resolveVerifyOutcome({ paymentStatus: 'SUCCESS', booking: booking() }),
    ).toBe('confirmed');
  });

  it('confirms a settled charge with no booking (non-booking purpose)', () => {
    expect(
      resolveVerifyOutcome({ paymentStatus: 'SUCCESS', booking: null }),
    ).toBe('confirmed');
  });

  it('reports refunded once the provider accepted the reversal', () => {
    expect(
      resolveVerifyOutcome({
        paymentStatus: 'REVERSED',
        booking: booking({ status: 'EXPIRED', refundedAmount: 100_000 }),
      }),
    ).toBe('refunded');
  });

  it('never claims a refund that failed', () => {
    expect(
      resolveVerifyOutcome({
        paymentStatus: 'REVERSED',
        booking: booking({ status: 'EXPIRED', refundFailedAt: new Date() }),
      }),
    ).toBe('refund_pending');
  });

  it('flags settled money still sitting on a dead booking', () => {
    expect(
      resolveVerifyOutcome({
        paymentStatus: 'SUCCESS',
        booking: booking({ status: 'CANCELLED' }),
      }),
    ).toBe('refund_pending');
  });

  it('reports nothing settled for a pending or failed charge', () => {
    expect(
      resolveVerifyOutcome({ paymentStatus: 'PENDING', booking: booking() }),
    ).toBe('not_confirmed');
    expect(
      resolveVerifyOutcome({ paymentStatus: 'FAILED', booking: null }),
    ).toBe('not_confirmed');
  });
});
