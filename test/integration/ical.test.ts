// Airbnb iCal sync and the export feed: UID-keyed idempotent import, the
// empty/non-calendar wipe guard, scoped pruning, and a PII-free export
// floored to recent dates.
import { afterEach, describe, expect, it, vi } from 'vitest';
import prisma, { BlockSource, BookingStatus } from '@/lib/prisma';
import {
  buildIcs,
  parseIcs,
  roomFeedEvents,
  syncRoomFromAirbnb,
} from '@/lib/hotel/ical';
import { parseDateOnly } from '@/lib/hotel/dates';
import { generateBookingCode } from '@/utils/codes';
import { createRoomTypeWithUnits, futureDate } from './helpers';

const AIRBNB_URL = 'https://airbnb.test/calendar.ics';

const vevent = (uid: string, start: string, end: string) =>
  [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${end.replace(/-/g, '')}`,
    'SUMMARY:Reserved',
    'END:VEVENT',
  ].join('\r\n');

const calendar = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');

function stubFeed(body: string, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok, status, text: () => Promise.resolve(body) }),
    ),
  );
}

async function roomWithFeed() {
  const { units } = await createRoomTypeWithUnits();
  return prisma.room.update({
    where: { id: units[0].id },
    data: { airbnbIcalUrl: AIRBNB_URL },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('syncRoomFromAirbnb', () => {
  it('imports events as blocks, idempotently keyed by UID', async () => {
    const room = await roomWithFeed();
    stubFeed(
      calendar(
        vevent('evt-1@airbnb', futureDate(10), futureDate(12)),
        vevent('evt-2@airbnb', futureDate(20), futureDate(22)),
      ),
    );

    const first = await syncRoomFromAirbnb(room.id);
    expect(first.imported).toBe(2);
    const again = await syncRoomFromAirbnb(room.id);
    expect(again.imported).toBe(2);
    expect(again.removed).toBe(0);

    const blocks = await prisma.calendarBlock.findMany({
      where: { roomId: room.id },
    });
    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.source === BlockSource.AIRBNB)).toBe(
      true,
    );

    const synced = await prisma.room.findUniqueOrThrow({
      where: { id: room.id },
    });
    expect(synced.icalLastSyncedAt).not.toBeNull();
  });

  it('a 200 that is not a calendar fails the sync and keeps every block', async () => {
    const room = await roomWithFeed();
    stubFeed(calendar(vevent('evt-1@airbnb', futureDate(10), futureDate(12))));
    await syncRoomFromAirbnb(room.id);

    stubFeed('<html>Sign in to Airbnb</html>');
    await expect(syncRoomFromAirbnb(room.id)).rejects.toThrow(
      /not a calendar/,
    );
    expect(
      await prisma.calendarBlock.count({ where: { roomId: room.id } }),
    ).toBe(1);
  });

  it('an empty (but valid) calendar never prunes existing blocks', async () => {
    const room = await roomWithFeed();
    stubFeed(calendar(vevent('evt-1@airbnb', futureDate(10), futureDate(12))));
    await syncRoomFromAirbnb(room.id);

    stubFeed(calendar());
    const result = await syncRoomFromAirbnb(room.id);
    expect(result.imported).toBe(0);
    expect(result.removed).toBe(0);
    expect(
      await prisma.calendarBlock.count({ where: { roomId: room.id } }),
    ).toBe(1);
  });

  it('prunes only blocks that vanished from a NON-empty feed, scoped to the room', async () => {
    const room = await roomWithFeed();
    stubFeed(
      calendar(
        vevent('evt-1@airbnb', futureDate(10), futureDate(12)),
        vevent('evt-2@airbnb', futureDate(20), futureDate(22)),
      ),
    );
    await syncRoomFromAirbnb(room.id);

    // A MANUAL block must survive any prune.
    await prisma.calendarBlock.create({
      data: {
        roomId: room.id,
        startDate: parseDateOnly(futureDate(30)),
        endDate: parseDateOnly(futureDate(32)),
        source: BlockSource.MANUAL,
      },
    });

    stubFeed(calendar(vevent('evt-1@airbnb', futureDate(10), futureDate(12))));
    const result = await syncRoomFromAirbnb(room.id);
    expect(result.removed).toBe(1);

    const remaining = await prisma.calendarBlock.findMany({
      where: { roomId: room.id },
      orderBy: { startDate: 'asc' },
    });
    expect(remaining).toHaveLength(2);
    expect(remaining[0].externalUid).toBe('evt-1@airbnb');
    expect(remaining[1].source).toBe(BlockSource.MANUAL);
  });

  it('a non-2xx fetch fails the sync outright', async () => {
    const room = await roomWithFeed();
    stubFeed('', false, 404);
    await expect(syncRoomFromAirbnb(room.id)).rejects.toThrow(/HTTP 404/);
  });
});

describe('parseIcs', () => {
  it('unfolds continuation lines and truncates DATE-TIME to dates', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:folded-',
      ' uid@airbnb',
      'DTSTART:20270110T140000Z',
      'DTEND;VALUE=DATE:20270112',
      'SUMMARY:Reserved',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const events = parseIcs(text);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe('folded-uid@airbnb');
    expect(events[0].start.toISOString()).toBe('2027-01-10T00:00:00.000Z');
  });

  it('drops events missing UID or dates', () => {
    const text = calendar(
      ['BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20270110', 'END:VEVENT'].join(
        '\r\n',
      ),
    );
    expect(parseIcs(text)).toHaveLength(0);
  });
});

describe('export feed', () => {
  it('exports blocking bookings and MANUAL blocks with no guest PII', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    await prisma.booking.create({
      data: {
        code: generateBookingCode(),
        roomTypeId: roomType.id,
        roomId: units[0].id,
        guestName: 'Private Guest',
        guestEmail: 'private@test.local',
        checkIn: parseDateOnly(futureDate(10)),
        checkOut: parseDateOnly(futureDate(12)),
        nights: 2,
        status: BookingStatus.CONFIRMED,
        baseAmount: 1,
        totalAmount: 1,
      },
    });
    // An imported AIRBNB block must NOT be echoed back (feedback loop);
    // a MANUAL block must be.
    await prisma.calendarBlock.createMany({
      data: [
        {
          roomId: units[0].id,
          startDate: parseDateOnly(futureDate(20)),
          endDate: parseDateOnly(futureDate(22)),
          source: BlockSource.AIRBNB,
          externalUid: 'evt-x@airbnb',
        },
        {
          roomId: units[0].id,
          startDate: parseDateOnly(futureDate(30)),
          endDate: parseDateOnly(futureDate(32)),
          source: BlockSource.MANUAL,
        },
      ],
    });

    const events = await roomFeedEvents(units[0].id);
    expect(events).toHaveLength(2);
    const ics = buildIcs(events);
    expect(ics).toContain('SUMMARY:Reserved');
    expect(ics).toContain('SUMMARY:Blocked');
    expect(ics).not.toContain('Private Guest');
    expect(ics).not.toContain('private@test.local');
    expect(ics).not.toContain('evt-x@airbnb');
  });

  it('floors the feed: stays ending over a year ago are excluded', async () => {
    const { roomType, units } = await createRoomTypeWithUnits();
    const ancient = new Date();
    ancient.setUTCFullYear(ancient.getUTCFullYear() - 2);
    const ancientEnd = new Date(ancient.getTime() + 2 * 86_400_000);
    // CONFIRMED is a blocking status, so only the date floor excludes it.
    await prisma.booking.create({
      data: {
        code: generateBookingCode(),
        roomTypeId: roomType.id,
        roomId: units[0].id,
        guestName: 'Old Guest',
        guestEmail: 'old@test.local',
        checkIn: ancient,
        checkOut: ancientEnd,
        nights: 2,
        status: BookingStatus.CONFIRMED,
        baseAmount: 1,
        totalAmount: 1,
      },
    });
    expect(await roomFeedEvents(units[0].id)).toHaveLength(0);
  });
});
