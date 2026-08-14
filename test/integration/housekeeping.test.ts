// Housekeeping service functions: hold expiry sweeps only what has lapsed,
// and lifecycle emails are marker-gated so a re-run never double-sends.
import { describe, expect, it, vi } from 'vitest';
import prisma, { BookingStatus } from '@/lib/prisma';
import {
  expireStaleHolds,
  sendLifecycleEmails,
} from '@/lib/hotel/booking-service';
import {
  sendCompletePaymentEmail,
  sendPreArrivalEmail,
  sendReviewInviteEmail,
} from '@/lib/mail/booking-emails';
import { parseDateOnly } from '@/lib/hotel/dates';
import { generateBookingCode } from '@/utils/codes';
import { createRoomTypeWithUnits, futureDate } from './helpers';

async function seed(
  roomTypeId: string,
  roomId: string,
  data: Partial<Parameters<typeof prisma.booking.create>[0]['data']>,
) {
  return prisma.booking.create({
    data: {
      code: generateBookingCode(),
      roomTypeId,
      roomId,
      guestName: 'Cron Guest',
      guestEmail: 'cron@test.local',
      checkIn: parseDateOnly(futureDate(10)),
      checkOut: parseDateOnly(futureDate(12)),
      nights: 2,
      baseAmount: 1,
      totalAmount: 1,
      ...data,
    } as Parameters<typeof prisma.booking.create>[0]['data'],
  });
}

describe('expireStaleHolds', () => {
  it('flips only past-expiry PENDING holds', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({ units: 4 });
    const lapsed = await seed(roomType.id, units[0].id, {
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date(Date.now() - 60_000),
    });
    const live = await seed(roomType.id, units[1].id, {
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const confirmed = await seed(roomType.id, units[2].id, {
      status: BookingStatus.CONFIRMED,
    });

    expect(await expireStaleHolds()).toBe(1);

    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: lapsed.id } }))
        .status,
    ).toBe(BookingStatus.EXPIRED);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: live.id } }))
        .status,
    ).toBe(BookingStatus.PENDING);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: confirmed.id } }))
        .status,
    ).toBe(BookingStatus.CONFIRMED);
  });
});

describe('sendLifecycleEmails', () => {
  it('sends each due email once; a re-run sends nothing more', async () => {
    const { roomType, units } = await createRoomTypeWithUnits({ units: 4 });

    // Payment nudge: PENDING, live hold, created 11 minutes ago.
    await seed(roomType.id, units[0].id, {
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date(Date.now() + 19 * 60_000),
      createdAt: new Date(Date.now() - 11 * 60_000),
    });
    // Pre-arrival: CONFIRMED, checking in tomorrow.
    await seed(roomType.id, units[1].id, {
      status: BookingStatus.CONFIRMED,
      checkIn: parseDateOnly(futureDate(1)),
      checkOut: parseDateOnly(futureDate(3)),
    });
    // Review invite: checked out yesterday.
    await seed(roomType.id, units[2].id, {
      status: BookingStatus.CHECKED_OUT,
      checkIn: parseDateOnly(futureDate(-4)),
      checkOut: parseDateOnly(futureDate(-1)),
      checkedOutAt: new Date(Date.now() - 86_400_000),
    });

    const first = await sendLifecycleEmails();
    expect(first).toEqual({
      paymentReminders: 1,
      reminders: 1,
      reviewInvites: 1,
    });
    expect(vi.mocked(sendCompletePaymentEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendPreArrivalEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendReviewInviteEmail)).toHaveBeenCalledTimes(1);

    const second = await sendLifecycleEmails();
    expect(second).toEqual({
      paymentReminders: 0,
      reminders: 0,
      reviewInvites: 0,
    });
    expect(vi.mocked(sendPreArrivalEmail)).toHaveBeenCalledTimes(1);
  });

  it('the marker is written even when the send fails (skip beats spam)', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    await seed(roomType.id, units[0].id, {
      status: BookingStatus.CONFIRMED,
      checkIn: parseDateOnly(futureDate(1)),
      checkOut: parseDateOnly(futureDate(3)),
    });
    vi.mocked(sendPreArrivalEmail).mockRejectedValueOnce(
      new Error('SMTP down'),
    );

    const first = await sendLifecycleEmails();
    expect(first.reminders).toBe(1);

    // The failed send is NOT retried - the marker already claimed it.
    const second = await sendLifecycleEmails();
    expect(second.reminders).toBe(0);
    expect(vi.mocked(sendPreArrivalEmail)).toHaveBeenCalledTimes(1);
  });
});
