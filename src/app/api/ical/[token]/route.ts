// src/app/api/ical/[token]/route.ts
import prisma from '@/lib/prisma';
import { buildIcs, roomFeedEvents } from '@/lib/hotel/ical';
import logger from '@/utils/logger';

/**
 * Per-unit iCal export feed. The unguessable token IS the auth (the same
 * model Airbnb/Booking.com use for calendar URLs); paste this URL into
 * Airbnb's "Import calendar" so it blocks our booked dates there. The
 * token is admin-rotatable (POST /api/admin/rooms/[id]/rotate-ical-token)
 * for when a URL leaks.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const room = await prisma.room.findFirst({
      where: { icalToken: token },
      select: { id: true, name: true },
    });
    if (!room) {
      return new Response('Not found', { status: 404 });
    }

    const events = await roomFeedEvents(room.id);

    return new Response(buildIcs(events), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${room.name.replace(/[^\w-]/g, '_')}.ics"`,
        // Calendar consumers poll; keep it fresh but cacheable briefly.
        // PRIVATE: the URL is a capability - a shared cache must never
        // store a token-addressed body.
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    // text/calendar consumers can't use the JSON envelope - plain 500.
    logger.error({ err }, 'iCal feed failed');
    return new Response('Internal error', { status: 500 });
  }
}
