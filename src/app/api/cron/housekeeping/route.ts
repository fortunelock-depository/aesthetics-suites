// src/app/api/cron/housekeeping/route.ts
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';
import {
  expireStaleHolds,
  sendLifecycleEmails,
} from '@/lib/hotel/booking-service';
import { syncAllAirbnbCalendars } from '@/lib/hotel/ical';
import { successResponse, handleApiError } from '@/utils/api-response';

/**
 * Scheduled housekeeping - vercel.json points Vercel Cron here every 15
 * minutes (Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
 * when that env var is set):
 * - expires lapsed unpaid booking holds, freeing their units;
 * - pulls every unit's Airbnb calendar so external bookings block dates
 *   here promptly (collision safety degrades with sync staleness);
 * - sends due lifecycle emails (pre-arrival reminders, review invites).
 */

// The run is dominated by external work (per-room 20s-capped Airbnb
// fetches, 1-email-per-second SMTP throttle); the platform default of 60s
// would kill a busy morning's run mid-way. The design is crash-safe either
// way (markers before sends, per-room isolation) - this just avoids
// pointlessly re-doing the head of the queue every tick.
export const maxDuration = 300;

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

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [expired, ical, lifecycle] = await Promise.all([
      expireStaleHolds(),
      syncAllAirbnbCalendars(),
      sendLifecycleEmails(),
    ]);

    return successResponse({ expiredHolds: expired, ical, lifecycle });
  } catch (err) {
    return handleApiError(err);
  }
}
