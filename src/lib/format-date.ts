// src/lib/format-date.ts
//
// Single source of date formatting (Intl-based, no library). en-GB gives
// "10 Aug 2026" ordering, matching the site's audience.

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (value: Date | string | number): string =>
  DATE.format(new Date(value));

export const formatDateTime = (value: Date | string | number): string =>
  DATE_TIME.format(new Date(value));

const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "7:35 am" - pairs with formatDate in two-line date cells. */
export const formatTime = (value: Date | string | number): string =>
  TIME.format(new Date(value));
