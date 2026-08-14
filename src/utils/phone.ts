// src/utils/phone.ts
//
// Unified phone normalization (the dms-backend pattern): every phone number
// that enters the system is parsed with libphonenumber-js and STORED in
// E.164 ("+233241234567"), so lookups, deduping, SMS/WhatsApp integrations
// and display formatting all work from one canonical shape. Ghana-first:
// national input ("024...") assumes GH unless the number is international.
import {
  parsePhoneNumberWithError,
  type CountryCode,
} from 'libphonenumber-js';
import { ValidationError } from '@/lib/errors';

export interface PhoneFormats {
  /** Canonical stored form, e.g. "+233241234567". */
  e164Format: string;
  /** Local display form, e.g. "024 123 4567". */
  nationalFormat: string;
  countryCode: string;
}

export type PhoneMode = 'validate' | 'parse';

export interface PhoneOptions {
  /**
   * - "validate": throws ValidationError on missing/invalid input (request validation)
   * - "parse": returns null on missing/invalid input (seeds / best-effort parsing)
   */
  mode?: PhoneMode;
  /** Default country used when the number isn't international. */
  defaultCountry?: CountryCode;
}

type NormalizedPhone =
  | { kind: 'national'; value: string; country: CountryCode }
  | { kind: 'international'; value: string };

function clean(rawInput: string) {
  return rawInput.trim().replace(/[()\s-]+/g, '');
}

function normalizePhoneInput(
  rawInput: string,
  defaultCountry: CountryCode,
): NormalizedPhone {
  const v = clean(rawInput);

  if (v.startsWith('+')) {
    // "+0..." is a typo'd national number.
    if (v.startsWith('+0')) {
      return { kind: 'national', value: v.slice(1), country: defaultCountry };
    }
    return { kind: 'international', value: v };
  }

  // National numbers typically start with 0.
  if (v.startsWith('0')) {
    return { kind: 'national', value: v, country: defaultCountry };
  }

  // Ghana calling code without '+'.
  if (v.startsWith('233')) {
    return { kind: 'international', value: `+${v}` };
  }

  // Otherwise treat as international missing its '+'.
  return { kind: 'international', value: `+${v}` };
}

export function handlePhone(
  phoneInput: string | null | undefined,
  options: { mode: 'parse'; defaultCountry?: CountryCode },
): PhoneFormats | null;

export function handlePhone(
  phoneInput: string | null | undefined,
  options?: { mode?: 'validate'; defaultCountry?: CountryCode },
): PhoneFormats;

/**
 * Unified phone handler:
 * - mode="validate" -> throws ValidationError (never returns null)
 * - mode="parse"    -> returns null for missing/invalid
 */
export function handlePhone(
  phoneInput: string | null | undefined,
  options: PhoneOptions = {},
): PhoneFormats | null {
  const { mode = 'validate', defaultCountry = 'GH' } = options;

  const raw = typeof phoneInput === 'string' ? phoneInput.trim() : '';

  if (!raw) {
    if (mode === 'parse') return null;
    throw new ValidationError('Phone number is required', 'PHONE_REQUIRED');
  }

  try {
    const normalized = normalizePhoneInput(raw, defaultCountry);

    const phoneNumber =
      normalized.kind === 'national'
        ? parsePhoneNumberWithError(normalized.value, normalized.country)
        : parsePhoneNumberWithError(normalized.value);

    if (!phoneNumber.isValid()) {
      throw new Error('Number failed validity check');
    }

    return {
      e164Format: phoneNumber.format('E.164'),
      nationalFormat: phoneNumber.formatNational(),
      countryCode: phoneNumber.country || defaultCountry,
    };
  } catch {
    if (mode === 'parse') return null;
    throw new ValidationError(
      'Invalid phone number format',
      'INVALID_PHONE_FORMAT',
    );
  }
}
