// src/app/api/cron/housekeeping/route.ts
import { NextResponse } from 'next/server';
import { ENV } from '@/config/env';
import {
  expireStaleHolds,
  sendLifecycleEmails,
} from '@/lib/hotel/booking-service';
import { syncAllAirbnbCalendars } from '@/lib/hotel/ical';
import { successResponse, handleApiError } from '@/utils/api-response';

/**
 * Scheduled housekeeping (point a cron at this every ~15 minutes with
 * `Authorization: Bearer ${CRON_SECRET}`):
 * - expires lapsed unpaid booking holds, freeing their units;
 * - pulls every unit's Airbnb calendar so external bookings block dates
 *   here promptly (collision safety degrades with sync staleness);
 * - sends due lifecycle emails (pre-arrival reminders, review invites).
 */
export async function GET(req: Request) {
  if (
    !ENV.CRON_SECRET ||
    req.headers.get('authorization') !== `Bearer ${ENV.CRON_SECRET}`
  ) {
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
