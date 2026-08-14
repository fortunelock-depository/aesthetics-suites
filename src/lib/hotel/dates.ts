// src/lib/hotel/dates.ts
//
// Calendar-date helpers for the booking domain. All stay dates are
// HALF-OPEN ranges - checkIn inclusive, checkOut exclusive (the checkout
// day is free to sell) - matching iCal DTSTART/DTEND semantics. Dates are
// normalized to UTC midnight so timezones can never shift a night.

/** Formats a Date back to "YYYY-MM-DD" (UTC). */
export const toDateOnlyString = (date: Date): string =>
  date.toISOString().slice(0, 10);

/**
 * True when the string is a REAL calendar date. The regex alone is not
 * enough: V8 rolls impossible dates over ("2026-02-31" parses to Mar 3),
 * so a valid value must round-trip back to itself exactly.
 */
export const isValidDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toDateOnlyString(date) === value;
};

/**
 * Parses "YYYY-MM-DD" to a UTC-midnight Date. Throws on rollover/invalid
 * input - API boundaries validate first (the `dateOnly` Zod schema), so a
 * throw here means an unvalidated internal path, not a user error.
 */
export const parseDateOnly = (value: string): Date => {
  if (!isValidDateOnly(value)) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole nights between two UTC-midnight dates. */
export const nightsBetween = (checkIn: Date, checkOut: Date): number =>
  Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);

/** Every night of the stay (checkIn .. checkOut-1), as UTC-midnight dates. */
export const eachNight = (checkIn: Date, checkOut: Date): Date[] => {
  const nights: Date[] = [];
  for (
    let t = checkIn.getTime();
    t < checkOut.getTime();
    t += MS_PER_DAY
  ) {
    nights.push(new Date(t));
  }
  return nights;
};

/** Half-open range overlap: [aStart,aEnd) intersects [bStart,bEnd). */
export const rangesOverlap = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean => aStart < bEnd && aEnd > bStart;

/** Today at UTC midnight. */
export const todayUtc = (): Date =>
  parseDateOnly(new Date().toISOString().slice(0, 10));
