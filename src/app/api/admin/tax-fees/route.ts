// src/app/api/admin/tax-fees/route.ts
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { successResponse, handleApiError } from '@/utils/api-response';
import { taxFeeCreateSchema } from '@/validations/hotel-validation';

export async function GET() {
  try {
    await requireAdmin();
    const taxFees = await prisma.taxFee.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return successResponse(taxFees);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = taxFeeCreateSchema.parse(await req.json());
    const taxFee = await prisma.taxFee.create({ data: input });
    return successResponse(taxFee, 'Tax/fee created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
