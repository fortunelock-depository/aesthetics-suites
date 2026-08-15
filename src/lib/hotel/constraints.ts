// src/lib/hotel/constraints.ts
//
// Database constraint names the application has to recognise by name, kept
// in one place so the migration, the service comment, and the HTTP mapping
// can never drift apart. Deliberately dependency-free: imported by both
// domain services and the generic response helper.

/**
 * btree_gist exclusion constraint added in
 * prisma/migrations/20260814124147_booking_unit_overlap_exclusion. It is
 * the database-level backstop against seating two blocking bookings on the
 * same unit for overlapping dates; the advisory lock in booking-service is
 * the primary gate, this catches anything that bypasses it.
 */
export const UNIT_OVERLAP_CONSTRAINT = 'Booking_no_unit_overlap';

/** Postgres exclusion_violation. Prisma has no typed code for it. */
const EXCLUSION_VIOLATION_SQLSTATE = '23P01';

function readString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * True when a thrown error is the unit-overlap exclusion violation.
 *
 * Prisma surfaces this differently depending on the path: the driver
 * adapter may attach the SQLSTATE under `meta`, while the classic engine
 * only puts it in the message. Check the structured fields first and fall
 * back to the message, so a driver upgrade that starts (or stops)
 * populating `meta` cannot silently turn a clean 409 into a 500.
 */
export function isUnitOverlapViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const meta = (err as { meta?: unknown }).meta;
  const metaCode =
    readString(meta, 'code') ??
    readString((meta as { driverAdapterError?: unknown })?.driverAdapterError, 'code') ??
    readString(
      ((meta as { driverAdapterError?: { cause?: unknown } })
        ?.driverAdapterError as { cause?: unknown })?.cause,
      'code',
    );
  if (metaCode === EXCLUSION_VIOLATION_SQLSTATE) return true;

  const constraint =
    readString(meta, 'constraint') ?? readString(meta, 'constraint_name');
  if (constraint === UNIT_OVERLAP_CONSTRAINT) return true;

  const message = err instanceof Error ? err.message : '';
  return (
    message.includes(EXCLUSION_VIOLATION_SQLSTATE) ||
    message.includes(UNIT_OVERLAP_CONSTRAINT)
  );
}
