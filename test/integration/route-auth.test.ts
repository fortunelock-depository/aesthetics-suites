// Route-level authorization.
//
// The admin-only gating of refunds and price overrides is enforced ONLY in
// the route handlers (the services take an actor id but do not police the
// role), so without these tests a regression that drops `requireAdmin` or
// the FRONT_DESK override check ships green. `verifySession` is the mocked
// seam - the role policy in `src/lib/api-auth.ts` and every guard call in
// the routes stay real.
import { describe, expect, it, vi } from 'vitest';
import prisma, { PaymentStatus, UserRole } from '@/lib/prisma';
import { UnauthorizedError } from '@/lib/errors';
import { verifySession } from '@/lib/session';
import { confirmPayment } from '@/lib/payments/payment-service';
import { createWebsiteBooking } from '@/lib/hotel/booking-service';
import { POST as refundPost } from '@/app/api/admin/bookings/[id]/refund/route';
import { POST as manualBookingPost } from '@/app/api/admin/bookings/route';
import { PATCH as bookingActionPatch } from '@/app/api/admin/bookings/[id]/route';
import { POST as rotateIcalPost } from '@/app/api/admin/rooms/[id]/rotate-ical-token/route';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>();
  return { ...actual, verifySession: vi.fn() };
});

/** Nobody signed in - the guards' UnauthorizedError path. */
function signedOut(): void {
  vi.mocked(verifySession).mockRejectedValue(new UnauthorizedError());
}

/**
 * Signs in as a REAL staff row: booking mutations stamp the actor via a
 * foreign key, so a synthetic id would fail the write rather than the
 * guard, and hide what these tests are actually asserting.
 */
async function signInAs(role: UserRole): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `staff-${Math.random().toString(16).slice(2)}@test.local`,
      password: 'not-a-real-hash',
      fullname: 'Route Auth Staff',
      role,
    },
  });
  vi.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: user.id,
    role,
    isAdmin: role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN,
  });
  return user.id;
}

const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api/admin', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

/** A CANCELLED booking whose payment is still settled - refundable. */
async function cancelledPaidBooking() {
  const { roomType } = await createRoomTypeWithUnits();
  const { booking } = await createWebsiteBooking(
    guestInput(roomType.slug, futureDate(20), futureDate(22)),
  );
  const payment = await prisma.payment.findFirstOrThrow({
    where: { purpose: 'BOOKING', purposeId: booking.id },
  });
  await confirmPayment(payment.reference);
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  return { booking, payment };
}

function manualBookingBody(roomTypeId: string, extra: object = {}) {
  return {
    roomTypeId,
    checkIn: futureDate(30),
    checkOut: futureDate(32),
    adults: 2,
    children: 0,
    guestName: 'Walk In',
    guestEmail: 'walkin@test.local',
    ...extra,
  };
}

describe('admin refund route', () => {
  it('401s without a session', async () => {
    const { booking } = await cancelledPaidBooking();
    signedOut();

    const res = await refundPost(jsonRequest({}), routeParams(booking.id));
    expect(res.status).toBe(401);
  });

  it('403s FRONT_DESK - refunds move real money', async () => {
    const { booking, payment } = await cancelledPaidBooking();
    await signInAs(UserRole.FRONT_DESK);

    const res = await refundPost(jsonRequest({}), routeParams(booking.id));
    expect(res.status).toBe(403);

    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(untouched.status).toBe(PaymentStatus.SUCCESS);
  });

  it('lets an ADMIN execute the refund', async () => {
    const { booking, payment } = await cancelledPaidBooking();
    await signInAs(UserRole.ADMIN);

    const res = await refundPost(jsonRequest({}), routeParams(booking.id));
    expect(res.status).toBe(200);

    const reversed = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    const refunded = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(refunded.refundedAmount).toBe(payment.amount);
  });
});

describe('manual booking totalOverride', () => {
  it('403s FRONT_DESK and creates nothing', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    await signInAs(UserRole.FRONT_DESK);

    const res = await manualBookingPost(
      jsonRequest(manualBookingBody(roomType.id, { totalOverride: 1 })),
    );
    expect(res.status).toBe(403);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('accepts a FRONT_DESK booking at the quoted price', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    await signInAs(UserRole.FRONT_DESK);

    const res = await manualBookingPost(
      jsonRequest(manualBookingBody(roomType.id)),
    );
    expect(res.status).toBe(201);
  });

  it('lets an ADMIN negotiate the total down', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const actorId = await signInAs(UserRole.ADMIN);

    const res = await manualBookingPost(
      jsonRequest(manualBookingBody(roomType.id, { totalOverride: 50_000 })),
    );
    expect(res.status).toBe(201);

    const created = await prisma.booking.findFirstOrThrow();
    expect(created.totalAmount).toBe(50_000);
    expect(created.createdById).toBe(actorId);
  });
});

describe('cancellation refund override', () => {
  it('403s FRONT_DESK forcing a refund', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking } = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(40), futureDate(42)),
    );
    await signInAs(UserRole.FRONT_DESK);

    const res = await bookingActionPatch(
      jsonRequest({ action: 'cancel', refund: true }),
      routeParams(booking.id),
    );
    expect(res.status).toBe(403);

    const still = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(still.status).toBe('PENDING');
  });

  it('lets FRONT_DESK cancel by policy (no override)', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking } = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(40), futureDate(42)),
    );
    await signInAs(UserRole.FRONT_DESK);

    const res = await bookingActionPatch(
      jsonRequest({ action: 'cancel' }),
      routeParams(booking.id),
    );
    expect(res.status).toBe(200);
  });

  it('lets an ADMIN force the refund', async () => {
    const { roomType } = await createRoomTypeWithUnits();
    const { booking } = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(40), futureDate(42)),
    );
    const actorId = await signInAs(UserRole.ADMIN);

    const res = await bookingActionPatch(
      jsonRequest({ action: 'cancel', refund: true }),
      routeParams(booking.id),
    );
    expect(res.status).toBe(200);

    const cancelled = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(cancelled.cancelledById).toBe(actorId);
  });
});

describe('iCal token rotation route', () => {
  it('403s FRONT_DESK and leaves the token alone', async () => {
    const { units } = await createRoomTypeWithUnits();
    const before = units[0].icalToken;
    await signInAs(UserRole.FRONT_DESK);

    const res = await rotateIcalPost(
      jsonRequest({}),
      routeParams(units[0].id),
    );
    expect(res.status).toBe(403);

    const unchanged = await prisma.room.findUniqueOrThrow({
      where: { id: units[0].id },
    });
    expect(unchanged.icalToken).toBe(before);
  });

  it('lets an ADMIN rotate the token', async () => {
    const { units } = await createRoomTypeWithUnits();
    const before = units[0].icalToken;
    await signInAs(UserRole.ADMIN);

    const res = await rotateIcalPost(
      jsonRequest({}),
      routeParams(units[0].id),
    );
    expect(res.status).toBe(200);

    const rotated = await prisma.room.findUniqueOrThrow({
      where: { id: units[0].id },
    });
    expect(rotated.icalToken).not.toBe(before);
  });
});
