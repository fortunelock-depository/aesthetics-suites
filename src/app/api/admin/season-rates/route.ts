// src/app/api/admin/season-rates/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { seasonRateCreateSchema } from '@/validations/hotel-validation';
import { parseDateOnly } from '@/lib/hotel/dates';
import { NotFoundError } from '@/middlewares/error-handler';

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

    const rate = await prisma.seasonRate.create({
      data: {
        ...input,
        startDate: parseDateOnly(input.startDate),
        endDate: parseDateOnly(input.endDate),
      },
    });

    return successResponse(rate, 'Season rate created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
