// src/lib/hotel/dates.ts
//
// Calendar-date helpers for the booking domain. All stay dates are
// HALF-OPEN ranges - checkIn inclusive, checkOut exclusive (the checkout
// day is free to sell) - matching iCal DTSTART/DTEND semantics. Dates are
// normalized to UTC midnight so timezones can never shift a night.

/** Parses "YYYY-MM-DD" to a UTC-midnight Date. */
export const parseDateOnly = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

/** Formats a Date back to "YYYY-MM-DD" (UTC). */
export const toDateOnlyString = (date: Date): string =>
  date.toISOString().slice(0, 10);

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
