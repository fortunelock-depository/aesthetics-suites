// src/app/api/admin/season-rates/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { seasonRateUpdateSchema } from '@/validations/hotel-validation';
import { parseDateOnly } from '@/lib/hotel/dates';
import { assertNoSeasonOverlap } from '@/lib/hotel/season-rates';
import { BadRequestError, NotFoundError } from '@/lib/errors';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = seasonRateUpdateSchema.parse(await req.json());

    const existing = await prisma.seasonRate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Season rate not found');

    // Cross-field date check against the MERGED row: patching only one of
    // the two dates could otherwise silently invert the range, after which
    // the rate never applies and peak nights sell at base price.
    const startDate = input.startDate
      ? parseDateOnly(input.startDate)
      : existing.startDate;
    const endDate = input.endDate
      ? parseDateOnly(input.endDate)
      : existing.endDate;
    if (endDate <= startDate) {
      throw new BadRequestError('endDate must be after startDate');
    }
    await assertNoSeasonOverlap(existing.roomTypeId, startDate, endDate, id);

    const rate = await prisma.seasonRate.update({
      where: { id },
      data: { ...input, startDate, endDate },
    });

    return successResponse(rate, 'Season rate updated');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.seasonRate.delete({ where: { id } });
    return successResponse({ id }, 'Season rate deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
