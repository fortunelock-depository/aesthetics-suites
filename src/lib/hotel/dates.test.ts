// src/lib/hotel/dates.test.ts
import { describe, expect, it } from 'vitest';
import { isValidDateOnly, parseDateOnly, toDateOnlyString } from './dates';

describe('isValidDateOnly / parseDateOnly', () => {
  it('accepts real calendar dates and round-trips them', () => {
    expect(isValidDateOnly('2026-02-28')).toBe(true);
    expect(toDateOnlyString(parseDateOnly('2026-02-28'))).toBe('2026-02-28');
    // Leap day on a leap year is real.
    expect(isValidDateOnly('2028-02-29')).toBe(true);
  });

  it('rejects rollover dates the regex alone would admit', () => {
    // V8 parses 2026-02-31 as March 3 - that must never book silently.
    expect(isValidDateOnly('2026-02-31')).toBe(false);
    expect(isValidDateOnly('2026-13-40')).toBe(false);
    expect(isValidDateOnly('2027-02-29')).toBe(false); // not a leap year
    expect(() => parseDateOnly('2026-02-31')).toThrow(RangeError);
  });

  it('rejects non-date shapes outright', () => {
    expect(isValidDateOnly('not-a-date')).toBe(false);
    expect(isValidDateOnly('2026-2-3')).toBe(false);
  });
});
