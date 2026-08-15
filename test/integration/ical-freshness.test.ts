// Demand-driven Airbnb calendar freshness, and the housekeeping run lock.
//
// Calendar accuracy is not on a timer any more: the room somebody is about
// to book is synced right then. These pin the parts that make that safe -
// the compare-and-swap claim (so concurrent visitors fetch once), the
// failure path (so a broken feed cannot mark a room falsely fresh), and the
// guarantee that none of it can block or break a booking.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import prisma, { BlockSource } from '@/lib/prisma';
import {
  BOOKING_STALE_MS,
  BROWSE_STALE_MS,
  FAILURE_BACKOFF_MS,
  refreshStaleCalendars,
} from '@/lib/hotel/ical';
import { createWebsiteBooking } from '@/lib/hotel/booking-service';
import { GET as housekeepingGet } from '@/app/api/cron/housekeeping/route';
import { createRoomTypeWithUnits, futureDate, guestInput } from './helpers';

const AIRBNB_URL = 'https://airbnb.test/calendar.ics';

const calendar = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');

const vevent = (uid: string, start: string, end: string) =>
  [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${end.replace(/-/g, '')}`,
    'SUMMARY:Reserved',
    'END:VEVENT',
  ].join('\r\n');

/** Counts fetches so "did it actually go to Airbnb?" is assertable. */
function stubFeed(body: string, ok = true) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({ ok, status: ok ? 200 : 500, text: () => Promise.resolve(body) }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubFailingFeed() {
  const fetchMock = vi.fn(() => Promise.reject(new Error('network down')));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A room type whose single unit has an Airbnb feed, aged to `staleMs`. */
async function roomTypeWithFeed(staleMs: number) {
  const { roomType, units } = await createRoomTypeWithUnits();
  const syncedAt = new Date(Date.now() - staleMs);
  await prisma.room.update({
    where: { id: units[0].id },
    data: { airbnbIcalUrl: AIRBNB_URL, icalLastSyncedAt: syncedAt },
  });
  return { roomType, unit: units[0], syncedAt };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refreshStaleCalendars', () => {
  it('syncs a stale calendar and records the fresh timestamp', async () => {
    const { roomType, unit } = await roomTypeWithFeed(BOOKING_STALE_MS * 2);
    const fetchMock = stubFeed(
      calendar(vevent('evt-1@airbnb', futureDate(10), futureDate(12))),
    );

    const result = await refreshStaleCalendars(roomType.id, {
      maxAgeMs: BOOKING_STALE_MS,
    });

    expect(result).toMatchObject({ synced: 1, failed: 0, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const blocks = await prisma.calendarBlock.findMany({
      where: { roomId: unit.id, source: BlockSource.AIRBNB },
    });
    expect(blocks).toHaveLength(1);

    const after = await prisma.room.findUniqueOrThrow({
      where: { id: unit.id },
    });
    expect(after.icalLastSyncedAt!.getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );
  });

  it('skips a calendar that is still fresh, without fetching', async () => {
    const { roomType } = await roomTypeWithFeed(60 * 1000);
    const fetchMock = stubFeed(calendar());

    const result = await refreshStaleCalendars(roomType.id, {
      maxAgeMs: BOOKING_STALE_MS,
    });

    expect(result).toMatchObject({ synced: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets exactly one of two concurrent refreshes fetch', async () => {
    const { roomType } = await roomTypeWithFeed(BROWSE_STALE_MS * 2);
    const fetchMock = stubFeed(
      calendar(vevent('evt-1@airbnb', futureDate(10), futureDate(12))),
    );

    // Both in flight before either awaits: the compare-and-swap on
    // icalLastSyncedAt is the only thing standing between them.
    const [first, second] = await Promise.all([
      refreshStaleCalendars(roomType.id, { maxAgeMs: BROWSE_STALE_MS }),
      refreshStaleCalendars(roomType.id, { maxAgeMs: BROWSE_STALE_MS }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.synced + second.synced).toBe(1);
    expect(first.skipped + second.skipped).toBe(1);
  });

  it('backs a failed feed off instead of refetching on every request', async () => {
    // The failure path must not simply hand the claim back: a permanently
    // broken feed (a rotated Airbnb URL) would then turn every single
    // availability request into a fresh outbound fetch, with no throttle
    // at all and ordinary traffic sustaining it.
    const { roomType, unit } = await roomTypeWithFeed(BOOKING_STALE_MS * 2);
    const fetchMock = stubFailingFeed();

    const result = await refreshStaleCalendars(roomType.id, {
      maxAgeMs: BOOKING_STALE_MS,
    });
    expect(result).toMatchObject({ synced: 0, failed: 1 });

    // A second call inside the backoff window does NOT reach the network.
    await refreshStaleCalendars(roomType.id, { maxAgeMs: BOOKING_STALE_MS });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // It is backed off, not parked: once the window passes it retries.
    await prisma.room.update({
      where: { id: unit.id },
      data: {
        icalLastSyncedAt: new Date(
          Date.now() - FAILURE_BACKOFF_MS - BOOKING_STALE_MS - 1_000,
        ),
      },
    });
    await refreshStaleCalendars(roomType.id, { maxAgeMs: BOOKING_STALE_MS });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('booking-time calendar sync', () => {
  it('pulls a stale calendar before seating the guest', async () => {
    const { roomType } = await roomTypeWithFeed(BOOKING_STALE_MS * 2);
    const fetchMock = stubFeed(
      calendar(vevent('evt-far@airbnb', futureDate(200), futureDate(202))),
    );

    const { booking } = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(5), futureDate(7)),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(booking.code).toBeTruthy();
  });

  it('does not re-fetch when the calendar was synced moments ago', async () => {
    const { roomType } = await roomTypeWithFeed(30 * 1000);
    const fetchMock = stubFeed(calendar());

    await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(5), futureDate(7)),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still books when Airbnb is unreachable', async () => {
    const { roomType } = await roomTypeWithFeed(BOOKING_STALE_MS * 2);
    stubFailingFeed();

    // A broken feed must never cost a real booking: the imported blocks we
    // already hold plus the locked re-check still protect correctness.
    const { booking } = await createWebsiteBooking(
      guestInput(roomType.slug, futureDate(5), futureDate(7)),
    );

    expect(booking.code).toBeTruthy();
    expect(booking.status).toBe('PENDING');
  });
});

describe('housekeeping run lock', () => {
  const secret = process.env.CRON_SECRET!;

  const call = () =>
    housekeepingGet(
      new Request('https://test.local/api/cron/housekeeping', {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );

  beforeEach(() => {
    stubFeed(calendar());
  });

  it('rejects a request without the bearer secret', async () => {
    const res = await housekeepingGet(
      new Request('https://test.local/api/cron/housekeeping'),
    );
    expect(res.status).toBe(401);
  });

  it('runs the sweeps and reports a summary', async () => {
    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.skipped).toBe(false);
    expect(body.data).toHaveProperty('expiredHolds');
    expect(body.data).toHaveProperty('ical');
    expect(body.data).toHaveProperty('lifecycle');
  });

  it('skips a run that lands on top of another, without erroring', async () => {
    // Hold the advisory lock from the test rather than racing two real
    // runs: whoever wins a race depends on how long the sweeps happen to
    // take, which makes the assertion timing-shaped and flaky on a fast
    // machine or an empty database. Taking the lock explicitly pins the
    // behaviour being tested - a run that cannot get the lock reports
    // already-running and returns 200 (not an error, so a pinger does not
    // retry-storm).
    //
    // The transaction below owns the lock for as long as it is open; the
    // route's own attempt happens inside it, then it rolls back.
    let status = 0;
    let body: { data: { skipped: boolean; reason?: string } } | null = null;

    await prisma
      .$transaction(async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext('housekeeping')::bigint) AS locked`;
        expect(locked).toBe(true);

        const res = await call();
        status = res.status;
        body = await res.json();

        // Roll back so the lock is released even if an assertion throws.
        throw new Error('__release__');
      })
      .catch((error: unknown) => {
        if ((error as Error).message !== '__release__') throw error;
      });

    expect(status).toBe(200);
    expect(body!.data.skipped).toBe(true);
    expect(body!.data.reason).toBe('already-running');
  });
});
