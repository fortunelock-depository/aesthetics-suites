// src/utils/phone.test.ts
import { describe, expect, it } from 'vitest';
import { handlePhone } from './phone';

describe('handlePhone', () => {
  it('normalizes every common Ghana input shape to one E.164 form', () => {
    const expected = '+233241234567';
    expect(handlePhone('0241234567').e164Format).toBe(expected);
    expect(handlePhone('024 123 4567').e164Format).toBe(expected);
    expect(handlePhone('024-123-4567').e164Format).toBe(expected);
    expect(handlePhone('+233241234567').e164Format).toBe(expected);
    expect(handlePhone('233241234567').e164Format).toBe(expected);
    expect(handlePhone('+0241234567').e164Format).toBe(expected);
  });

  it('keeps genuinely international numbers international', () => {
    expect(handlePhone('+14155552671').e164Format).toBe('+14155552671');
    expect(handlePhone('+14155552671').countryCode).toBe('US');
    // Never coerced into the default country.
    expect(handlePhone('+447911123456').countryCode).not.toBe('GH');
  });

  it('parse mode returns null instead of throwing', () => {
    expect(handlePhone('not-a-phone', { mode: 'parse' })).toBeNull();
    expect(handlePhone('', { mode: 'parse' })).toBeNull();
    expect(handlePhone('12', { mode: 'parse' })).toBeNull();
  });

  it('validate mode throws on garbage', () => {
    expect(() => handlePhone('not-a-phone')).toThrow(
      'Invalid phone number format',
    );
    expect(() => handlePhone('')).toThrow('Phone number is required');
  });
});
