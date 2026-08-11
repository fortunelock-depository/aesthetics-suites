// src/app/api/admin/season-rates/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { seasonRateUpdateSchema } from '@/validations/hotel-validation';
import { parseDateOnly } from '@/lib/hotel/dates';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = seasonRateUpdateSchema.parse(await req.json());

    const rate = await prisma.seasonRate.update({
      where: { id },
      data: {
        ...input,
        ...(input.startDate
          ? { startDate: parseDateOnly(input.startDate) }
          : {}),
        ...(input.endDate ? { endDate: parseDateOnly(input.endDate) } : {}),
      },
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
