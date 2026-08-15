// src/lib/hotel/ical.ts
//
// iCal (RFC 5545) support for two-way Airbnb sync, dependency-free:
//
// EXPORT: each unit exposes a secret feed (/api/ical/<token>) of its booked
// and blocked ranges; paste it into Airbnb's "Import calendar" so Airbnb
// closes those dates.
// IMPORT: each unit can store its Airbnb "Export calendar" URL; the sync
// job pulls it and upserts the busy ranges as CalendarBlocks (keyed by
// VEVENT UID) so direct bookings can never collide with Airbnb bookings.
//
// All-day VEVENTs use DATE values with DTEND exclusive - exactly our
// half-open [checkIn, checkOut) convention, so no off-by-one mapping.
import 'server-only';
import prisma, { BlockSource } from '@/lib/prisma';
import { BLOCKING_STATUSES } from './availability';
import { parseDateOnly, toDateOnlyString } from './dates';
import { SITE } from '@/config/constants';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/lib/errors';

const PRODID = `-//${SITE.name}//Room Calendar//EN`;

/**
 * Fetch budgets. The scheduled sweep can afford to wait on a slow Airbnb;
 * a guest mid-checkout cannot, so the booking path passes a tighter cap and
 * simply proceeds on timeout (see refreshStaleCalendars).
 */
const SCHEDULED_FETCH_TIMEOUT_MS = 20_000;
export const BOOKING_FETCH_TIMEOUT_MS = 10_000;
/**
 * Browsing pays a tighter budget than the scheduled sweep: this fetch is
 * warming data for the NEXT look, so it is never worth holding a function
 * invocation open for twenty seconds on a feed that is not answering.
 */
export const BROWSE_FETCH_TIMEOUT_MS = 8_000;

/**
 * How long a failed feed is left alone before another request may retry it.
 * Without this a permanently broken URL is re-fetched on every single
 * request, because the failure path hands the claim straight back.
 */
export const FAILURE_BACKOFF_MS = 10 * 60 * 1000;

/**
 * Freshness thresholds for the demand-driven refresh. Calendar accuracy is
 * not a scheduling problem: it matters at the moment somebody might take a
 * room, so we sync the room being looked at rather than every room on a
 * timer. Booking submit uses the tight one (that is where a stale calendar
 * becomes a real double booking); browsing uses the loose one to warm the
 * data for the next look without hammering Airbnb.
 */
export const BOOKING_STALE_MS = 5 * 60 * 1000;
export const BROWSE_STALE_MS = 15 * 60 * 1000;

const toIcsDate = (date: Date): string =>
  toDateOnlyString(date).replace(/-/g, '');

const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

/** Builds the ICS document for a unit's busy ranges. */
export function buildIcs(events: IcsEventInput[]): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.start)}`,
      `DTEND;VALUE=DATE:${toIcsDate(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 wants CRLF line endings.
  return lines.join('\r\n');
}

export interface ParsedIcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string | null;
}

/**
 * Minimal VEVENT parser for calendar feeds (Airbnb exports all-day DATE
 * events). Handles folded lines and both DATE and DATE-TIME values (times
 * are truncated to their date - busy is busy).
 */
export function parseIcs(text: string): ParsedIcsEvent[] {
  // Unfold: a line starting with space/tab continues the previous line.
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedIcsEvent[] = [];
  let current: Partial<ParsedIcsEvent> | null = null;

  const parseIcsDate = (raw: string): Date | null => {
    const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return null;
    return parseDateOnly(`${match[1]}-${match[2]}-${match[3]}`);
  };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.uid && current.start && current.end) {
        events.push({
          uid: current.uid,
          start: current.start,
          end: current.end,
          summary: current.summary ?? null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const name = line.slice(0, colon).split(';')[0].toUpperCase();
    const value = line.slice(colon + 1).trim();

    if (name === 'UID') current.uid = value;
    else if (name === 'DTSTART') current.start = parseIcsDate(value) ?? undefined;
    else if (name === 'DTEND') current.end = parseIcsDate(value) ?? undefined;
    else if (name === 'SUMMARY') current.summary = value;
  }

  return events;
}

/** The events for a unit's export feed: blocking bookings + manual blocks.
 * Floored to the last year: consumers only need current/future busy dates,
 * and an unbounded feed grows forever. */
export async function roomFeedEvents(roomId: string): Promise<IcsEventInput[]> {
  const floor = new Date();
  floor.setUTCFullYear(floor.getUTCFullYear() - 1);
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId,
        status: { in: BLOCKING_STATUSES },
        checkOut: { gte: floor },
      },
      select: { id: true, checkIn: true, checkOut: true },
    }),
    prisma.calendarBlock.findMany({
      // Airbnb-imported blocks are NOT exported back (Airbnb already has
      // them); echoing them creates feedback loops.
      where: { roomId, source: BlockSource.MANUAL, endDate: { gte: floor } },
      select: { id: true, startDate: true, endDate: true },
    }),
  ]);

  return [
    ...bookings.map((booking) => ({
      uid: `booking-${booking.id}@aesthetics-suites`,
      start: booking.checkIn,
      end: booking.checkOut,
      summary: 'Reserved',
    })),
    ...blocks.map((block) => ({
      uid: `block-${block.id}@aesthetics-suites`,
      start: block.startDate,
      end: block.endDate,
      summary: 'Blocked',
    })),
  ];
}

/**
 * Pulls a unit's Airbnb calendar and mirrors it into CalendarBlocks:
 * upserts by VEVENT UID, removes AIRBNB blocks that vanished from the feed
 * (a cancelled Airbnb booking frees the dates here too).
 */
export async function syncRoomFromAirbnb(
  roomId: string,
  options: { timeoutMs?: number } = {},
): Promise<{
  imported: number;
  removed: number;
}> {
  const room = await prisma.room.findFirst({
    where: { id: roomId },
    select: { id: true, airbnbIcalUrl: true },
  });
  if (!room) throw new NotFoundError('Room not found');
  if (!room.airbnbIcalUrl) {
    throw new BadRequestError('This unit has no Airbnb calendar URL set.');
  }

  const response = await fetch(room.airbnbIcalUrl, {
    headers: { Accept: 'text/calendar' },
    signal: AbortSignal.timeout(options.timeoutMs ?? SCHEDULED_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new BadRequestError(
      `Airbnb calendar fetch failed (HTTP ${response.status}).`,
    );
  }

  // A 200 that is not actually a calendar (rotated/expired export URL
  // redirecting to an HTML page, truncated body) would parse to zero
  // events and the prune below would then DELETE every imported block -
  // reopening dates a real Airbnb guest holds. Fail the sync instead;
  // existing blocks stay and icalLastSyncedAt goes stale, which is what
  // the dashboard's stale-calendars alert watches.
  const body = await response.text();
  if (!body.includes('BEGIN:VCALENDAR')) {
    throw new BadRequestError(
      'Airbnb returned something that is not a calendar - keeping existing blocks. Check the calendar URL.',
    );
  }

  const events = parseIcs(body);
  const seenUids: string[] = [];

  for (const event of events) {
    seenUids.push(event.uid);
    await prisma.calendarBlock.upsert({
      where: { roomId_externalUid: { roomId, externalUid: event.uid } },
      create: {
        roomId,
        startDate: event.start,
        endDate: event.end,
        source: BlockSource.AIRBNB,
        externalUid: event.uid,
        summary: event.summary?.slice(0, 255),
      },
      update: {
        startDate: event.start,
        endDate: event.end,
        summary: event.summary?.slice(0, 255),
      },
    });
  }

  // Prune blocks that vanished from the feed - but never on an EMPTY
  // parse: a legitimately empty Airbnb calendar and a broken response are
  // indistinguishable here, and wrongly deleting blocks means selling
  // dates an Airbnb guest holds. An actually-freed date still clears on
  // the next sync that parses at least one event.
  const removed =
    events.length > 0
      ? await prisma.calendarBlock.deleteMany({
          where: {
            roomId,
            source: BlockSource.AIRBNB,
            externalUid: { notIn: seenUids },
          },
        })
      : { count: 0 };

  await prisma.room.update({
    where: { id: roomId },
    data: { icalLastSyncedAt: new Date() },
  });

  logger.info(
    { roomId, imported: events.length, removed: removed.count },
    'Airbnb calendar synced',
  );
  return { imported: events.length, removed: removed.count };
}

export interface IRefreshResult {
  /** Units whose calendar was pulled successfully in this call. */
  synced: number;
  /** Units we claimed but whose fetch/parse failed (staleness preserved). */
  failed: number;
  /** Units already fresh, or claimed by a concurrent caller. */
  skipped: number;
}

/**
 * Refreshes the Airbnb calendars of one room type's units, but only those
 * staler than `maxAgeMs`. This is the demand-driven half of calendar
 * freshness: instead of sweeping every room on a timer (which still leaves
 * a window as wide as the interval), the room somebody is actually looking
 * at or booking is brought current right then.
 *
 * Concurrency: `icalLastSyncedAt` doubles as the claim. Setting it to now
 * GUARDED ON ITS PREVIOUS VALUE is a compare-and-swap - two simultaneous
 * requests race, exactly one update matches, and only that one fetches.
 * Same optimistic-claim pattern the payment and booking paths use, and it
 * needs no extra infrastructure or table.
 *
 * A failed sync restores the previous timestamp: leaving it set would mark
 * the room falsely fresh and suppress the next attempt for a full window,
 * which is precisely the staleness this exists to prevent.
 *
 * Never throws - callers are request paths that must not fail because
 * Airbnb is slow.
 */
export async function refreshStaleCalendars(
  roomTypeId: string,
  options: { maxAgeMs: number; timeoutMs?: number },
): Promise<IRefreshResult> {
  const result: IRefreshResult = { synced: 0, failed: 0, skipped: 0 };

  try {
    const cutoff = new Date(Date.now() - options.maxAgeMs);
    const units = await prisma.room.findMany({
      where: { roomTypeId, airbnbIcalUrl: { not: null } },
      select: { id: true, icalLastSyncedAt: true },
    });

    const stale = units.filter(
      (unit) => unit.icalLastSyncedAt === null || unit.icalLastSyncedAt < cutoff,
    );
    result.skipped = units.length - stale.length;
    if (stale.length === 0) return result;

    const outcomes = await Promise.allSettled(
      stale.map(async (unit) => {
        // Compare-and-swap: whoever flips the timestamp owns the fetch.
        const claim = await prisma.room.updateMany({
          where: { id: unit.id, icalLastSyncedAt: unit.icalLastSyncedAt },
          data: { icalLastSyncedAt: new Date() },
        });
        if (claim.count === 0) return 'skipped' as const;

        try {
          await syncRoomFromAirbnb(unit.id, {
            timeoutMs: options.timeoutMs,
          });
          return 'synced' as const;
        } catch (error) {
          // Back off rather than restoring the original timestamp. Putting
          // the old value back leaves the unit instantly re-claimable, so a
          // permanently broken feed (a rotated Airbnb URL) turns every
          // request into a fresh outbound fetch with no throttle at all.
          // This keeps the unit visibly stale for the dashboard alert while
          // capping retries to one per backoff window.
          await prisma.room
            .update({
              where: { id: unit.id },
              data: {
                // Capped at now so a short freshness window can never
                // record a sync in the future.
                icalLastSyncedAt: new Date(
                  Math.min(
                    Date.now(),
                    Date.now() - options.maxAgeMs + FAILURE_BACKOFF_MS,
                  ),
                ),
              },
            })
            .catch(() => {
              // Best effort: the next scheduled sweep still covers it.
            });
          logger.warn(
            { error, roomId: unit.id },
            'On-demand Airbnb calendar refresh failed',
          );
          return 'failed' as const;
        }
      }),
    );

    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') result.failed += 1;
      else result[outcome.value] += 1;
    }
  } catch (error) {
    logger.warn({ error, roomTypeId }, 'On-demand calendar refresh aborted');
  }

  return result;
}

/** Syncs every unit that has an Airbnb calendar URL (housekeeping cron). */
export async function syncAllAirbnbCalendars(): Promise<{
  synced: number;
  failed: number;
}> {
  const rooms = await prisma.room.findMany({
    where: { airbnbIcalUrl: { not: null } },
    select: { id: true },
  });

  // Concurrent: each sync isolates its own failure, and serializing N
  // 20-second external fetches would burn the cron's whole time budget.
  const results = await Promise.allSettled(
    rooms.map(async (room) => {
      try {
        await syncRoomFromAirbnb(room.id);
      } catch (error) {
        logger.error({ error, roomId: room.id }, 'Airbnb calendar sync failed');
        throw error;
      }
    }),
  );
  const synced = results.filter((r) => r.status === 'fulfilled').length;
  return { synced, failed: results.length - synced };
}
