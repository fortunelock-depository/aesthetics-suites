// src/app/api/admin/season-rates/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { seasonRateCreateSchema } from '@/validations/hotel-validation';
import { parseDateOnly } from '@/lib/hotel/dates';
import { assertNoSeasonOverlap } from '@/lib/hotel/season-rates';
import { NotFoundError } from '@/lib/errors';

/** Creates a season rate (the list rides on the room-type detail). */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = seasonRateCreateSchema.parse(await req.json());

    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundError('Room type not found');

    const startDate = parseDateOnly(input.startDate);
    const endDate = parseDateOnly(input.endDate);
    await assertNoSeasonOverlap(input.roomTypeId, startDate, endDate);

    const rate = await prisma.seasonRate.create({
      data: { ...input, startDate, endDate },
    });

    return successResponse(rate, 'Season rate created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
