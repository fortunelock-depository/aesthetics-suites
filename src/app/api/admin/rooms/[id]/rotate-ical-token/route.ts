// src/app/api/admin/rooms/[id]/rotate-ical-token/route.ts
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { NotFoundError } from '@/lib/errors';

/**
 * Regenerates a unit's iCal export token. The feed URL is a capability -
 * once pasted into Airbnb, emailed around, or leaked from a shared cache
 * there is no other way to revoke it. The old URL 404s immediately;
 * re-paste the new one wherever the calendar is imported.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const room = await prisma.room.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!room) throw new NotFoundError('Unit not found');

    const updated = await prisma.room.update({
      where: { id },
      data: { icalToken: crypto.randomUUID() },
      select: { id: true, icalToken: true },
    });

    return successResponse(updated, 'iCal link regenerated - update it anywhere the old one was pasted');
  } catch (err) {
    return handleApiError(err);
  }
}
