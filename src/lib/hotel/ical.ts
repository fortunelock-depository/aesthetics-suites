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
import { BadRequestError, NotFoundError } from '@/middlewares/error-handler';

const PRODID = `-//${SITE.name}//Room Calendar//EN`;

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

/** The events for a unit's export feed: blocking bookings + manual blocks. */
export async function roomFeedEvents(roomId: string): Promise<IcsEventInput[]> {
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { roomId, status: { in: BLOCKING_STATUSES } },
      select: { id: true, checkIn: true, checkOut: true },
    }),
    prisma.calendarBlock.findMany({
      // Airbnb-imported blocks are NOT exported back (Airbnb already has
      // them); echoing them creates feedback loops.
      where: { roomId, source: BlockSource.MANUAL },
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
export async function syncRoomFromAirbnb(roomId: string): Promise<{
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
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new BadRequestError(
      `Airbnb calendar fetch failed (HTTP ${response.status}).`,
    );
  }

  const events = parseIcs(await response.text());
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

  const removed = await prisma.calendarBlock.deleteMany({
    where: {
      roomId,
      source: BlockSource.AIRBNB,
      externalUid: { notIn: seenUids },
    },
  });

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

/** Syncs every unit that has an Airbnb calendar URL (housekeeping cron). */
export async function syncAllAirbnbCalendars(): Promise<{
  synced: number;
  failed: number;
}> {
  const rooms = await prisma.room.findMany({
    where: { airbnbIcalUrl: { not: null } },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  for (const room of rooms) {
    try {
      await syncRoomFromAirbnb(room.id);
      synced++;
    } catch (error) {
      failed++;
      logger.error({ error, roomId: room.id }, 'Airbnb calendar sync failed');
    }
  }
  return { synced, failed };
}
