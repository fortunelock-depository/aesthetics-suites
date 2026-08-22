// src/app/api/cron/housekeeping/route.ts
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';
import {
  expireStaleHolds,
  reconcileStrandedBookingPayments,
  sendLifecycleEmails,
} from '@/lib/hotel/booking-service';
import { syncAllAirbnbCalendars } from '@/lib/hotel/ical';
import prisma from '@/lib/prisma';
import logger from '@/utils/logger';
import { successResponse } from '@/utils/api-response';
import '@/config/startup-checks';

/**
 * Batch housekeeping, driven by an external pinger (cron-job.org) with
 * `vercel.json`'s daily run as a free backstop. Both send
 * `Authorization: Bearer ${CRON_SECRET}`; Vercel Cron adds it automatically
 * when that env var is set.
 *
 * What this run is NOT responsible for: Airbnb calendar freshness. That is
 * demand-driven (lib/hotel/ical.ts refreshes the room being browsed or
 * booked, on the spot), because a schedule can only ever be as fresh as its
 * interval. The sweep here is the safety net for units nobody looked at.
 *
 * Cadence is a BILLING decision, not a correctness one: the database is
 * Neon with autosuspend, and any query wakes the compute for the whole
 * suspend window, so cost tracks how often we ping, not how much each ping
 * does. Hence few big runs (hourly) rather than many small ones.
 */

// Pinned to 60 because Vercel FAILS THE DEPLOYMENT when maxDuration exceeds
// the plan maximum, and Hobby's maximum is 60 - a larger value would block
// shipping rather than degrade. Pro can raise it to 300. Being cut short is
// safe: markers are written before sends and each room's sync is isolated,
// so an interrupted run resumes next time instead of repeating work.
export const maxDuration = 60;

/** Constant-time bearer check over fixed-width digests (length can't leak). */
function cronAuthorized(header: string | null): boolean {
  if (!ENV.CRON_SECRET || !header) return false;
  const digest = (value: string) =>
    crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(
    digest(header),
    digest(`Bearer ${ENV.CRON_SECRET}`),
  );
}

/**
 * Prisma's interactive-transaction budget for the whole run. It matches
 * maxDuration so the platform kills the function at roughly the moment the
 * transaction would give up - either way the lock goes with the connection.
 */
const LOCK_TX_TIMEOUT_MS = 60_000;

/**
 * Runs `work` under a Postgres advisory lock so a double-fire from the
 * pinger, or the Vercel backstop landing on top of a live run, cannot
 * duplicate the sweeps. Returns null when another run holds the lock.
 *
 * Transaction-scoped (`pg_try_advisory_xact_lock`) rather than session
 * scoped: the pooled adapter gives no guarantee that a later
 * `pg_advisory_unlock` lands on the same connection that took the lock, so
 * a session lock could leak until the connection recycled. A transaction
 * lock is released by the transaction ending - including on a crash, a
 * timeout, or the function being killed mid-run, which is exactly the
 * self-healing property a lock nobody is around to clean up needs.
 *
 * The work itself deliberately uses the global client, not `tx`: this
 * transaction exists only to own the lock, and routing the sweeps through
 * it would hold a single connection for every query in the run.
 */
async function withRunLock<T>(work: () => Promise<T>): Promise<T | null> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(hashtext('housekeeping')::bigint) AS locked`;
      if (!rows[0]?.locked) return null;
      return work();
    },
    { timeout: LOCK_TX_TIMEOUT_MS, maxWait: 5_000 },
  );
}

interface ISectionResult {
  ok: boolean;
  detail: unknown;
}

/** Runs one sweep, converting a failure into a reported outcome. */
async function section<T>(
  name: string,
  run: () => Promise<T>,
): Promise<ISectionResult> {
  try {
    return { ok: true, detail: await run() };
  } catch (error) {
    logger.error({ error, section: name }, 'Housekeeping section failed');
    return { ok: false, detail: null };
  }
}

async function runHousekeeping() {
  // Each section reports independently: a broken SMTP host should not cost
  // us the hold sweep, and the pinger should not be told to retry work that
  // already succeeded.
  // Stranded paid bookings are reconciled BEFORE holds are expired: a
  // booking whose payment landed but whose fulfilment died is still PENDING,
  // and expiring it first would hand its unit away from a guest who paid.
  const stranded = await section(
    'stranded-payments',
    reconcileStrandedBookingPayments,
  );

  const [holds, ical, lifecycle] = await Promise.all([
    section('holds', expireStaleHolds),
    section('ical', syncAllAirbnbCalendars),
    section('lifecycle', sendLifecycleEmails),
  ]);

  return {
    skipped: false,
    ok: stranded.ok && holds.ok && ical.ok && lifecycle.ok,
    strandedPayments: stranded.detail,
    expiredHolds: holds.detail,
    ical: ical.detail,
    lifecycle: lifecycle.detail,
  };
}

/**
 * GET and POST both work so any pinger can call this; cron-job.org defaults
 * to GET and Vercel Cron always uses GET.
 */
async function handle(req: Request) {
  if (!cronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await withRunLock(runHousekeeping);

    // 200, not 409: a scheduler that sees an error retries, and retrying
    // against a run that is simply still going helps nobody.
    if (!summary) {
      return successResponse({ skipped: true, reason: 'already-running' });
    }
    return successResponse(summary);
  } catch (error) {
    // Only a total failure (lock query, transaction budget) lands here;
    // per-section failures are reported inside the 200 above.
    logger.error({ error }, 'Housekeeping run failed');
    return NextResponse.json(
      { message: 'Housekeeping run failed' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
