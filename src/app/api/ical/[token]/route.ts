// src/app/api/ical/[token]/route.ts
import prisma from '@/lib/prisma';
import { buildIcs, roomFeedEvents } from '@/lib/hotel/ical';

/**
 * Per-unit iCal export feed. The unguessable token IS the auth (the same
 * model Airbnb/Booking.com use for calendar URLs); paste this URL into
 * Airbnb's "Import calendar" so it blocks our booked dates there.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
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
      // Calendar consumers poll; keep it fresh but cacheable for a bit.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
