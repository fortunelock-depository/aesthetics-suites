// src/app/api/admin/tax-fees/[id]/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { taxFeeUpdateSchema } from '@/validations/hotel-validation';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = taxFeeUpdateSchema.parse(await req.json());
    const taxFee = await prisma.taxFee.update({ where: { id }, data: input });
    return successResponse(taxFee, 'Tax/fee updated');
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
    // Hard delete is safe: applied taxes are frozen on each booking's
    // taxBreakdown, so history never depends on this row.
    await prisma.taxFee.delete({ where: { id } });
    return successResponse({ id }, 'Tax/fee deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
