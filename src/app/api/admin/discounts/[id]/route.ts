// src/app/api/admin/discounts/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { discountUpdateSchema } from '@/validations/hotel-validation';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = discountUpdateSchema.parse(await req.json());

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...input,
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
      },
    });

    return successResponse(discount, 'Discount updated');
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
    await prisma.discount.delete({ where: { id } });
    return successResponse({ id }, 'Discount deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
