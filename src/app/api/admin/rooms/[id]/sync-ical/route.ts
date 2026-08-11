// src/app/api/admin/rooms/[id]/sync-ical/route.ts
import { requireAdmin } from '@/lib/api-auth';
import { syncRoomFromAirbnb } from '@/lib/hotel/ical';
import { successResponse, handleApiError } from '@/utils/api-response';

/** On-demand Airbnb calendar pull for one unit (the cron does all units). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const result = await syncRoomFromAirbnb(id);
    return successResponse(result, 'Calendar synced');
  } catch (err) {
    return handleApiError(err);
  }
}
