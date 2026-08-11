// src/validations/form-primitives.test.ts
import { describe, expect, it } from 'vitest';
import {
  dateOnlyString,
  ghsAmountField,
  intStringField,
  optionalGhsAmountField,
  optionalIntStringField,
} from './form-primitives';

describe('ghsAmountField', () => {
  const field = ghsAmountField('the price', 1);

  it('converts whole cedis to pesewas', () => {
    expect(field.parse('450')).toBe(45_000);
  });

  it('converts decimal cedis to pesewas', () => {
    expect(field.parse('450.5')).toBe(45_050);
    expect(field.parse('450.55')).toBe(45_055);
  });

  it('never produces float drift', () => {
    // 0.1 + 0.2 style inputs must round to exact integers.
    expect(field.parse('19.99')).toBe(1_999);
    expect(Number.isInteger(field.parse('123.45'))).toBe(true);
  });

  it('rejects non-numeric and negative shapes', () => {
    expect(() => field.parse('abc')).toThrow();
    expect(() => field.parse('-5')).toThrow();
    expect(() => field.parse('1.234')).toThrow();
  });

  it('enforces the minimum in minor units', () => {
    expect(() => ghsAmountField('x', 100).parse('0.5')).toThrow();
    expect(ghsAmountField('x', 100).parse('1')).toBe(100);
  });
});

describe('intStringField', () => {
  const field = intStringField(1, 20);

  it('parses in-range whole numbers', () => {
    expect(field.parse('1')).toBe(1);
    expect(field.parse(' 20 ')).toBe(20);
  });

  it('rejects empty, fractional and out-of-range values', () => {
    expect(() => field.parse('')).toThrow();
    expect(() => field.parse('1.5')).toThrow();
    expect(() => field.parse('0')).toThrow();
    expect(() => field.parse('21')).toThrow();
    expect(() => field.parse('abc')).toThrow();
  });
});

describe('optionalIntStringField', () => {
  const field = optionalIntStringField(1, 90);

  it('maps empty to undefined', () => {
    expect(field.parse('')).toBeUndefined();
    expect(field.parse('  ')).toBeUndefined();
  });

  it('parses and bounds when present', () => {
    expect(field.parse('2')).toBe(2);
    expect(() => field.parse('91')).toThrow();
  });
});

describe('optionalGhsAmountField', () => {
  const field = optionalGhsAmountField('the total');

  it('maps empty to undefined, else pesewas', () => {
    expect(field.parse('')).toBeUndefined();
    expect(field.parse('900.50')).toBe(90_050);
    expect(() => field.parse('nine')).toThrow();
  });
});

describe('dateOnlyString', () => {
  it('accepts YYYY-MM-DD only', () => {
    expect(dateOnlyString.parse('2026-08-11')).toBe('2026-08-11');
    expect(() => dateOnlyString.parse('11/08/2026')).toThrow();
    expect(() => dateOnlyString.parse('')).toThrow();
  });
});
