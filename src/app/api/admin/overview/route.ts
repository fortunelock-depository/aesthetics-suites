// src/app/api/admin/overview/route.ts
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/api-auth';
import { getDashboardStats } from '@/lib/hotel/dashboard-service';
import { successResponse, handleApiError } from '@/utils/api-response';

const querySchema = z.object({
  preset: z
    .enum([
      'TODAY',
      'THIS_WEEK',
      'THIS_MONTH',
      'LAST_MONTH',
      'LAST_90_DAYS',
      'THIS_YEAR',
    ])
    .default('THIS_MONTH'),
});

/** The rich dashboard payload (dms-style: range cards w/ trends + ops). */
export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const { preset } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    return successResponse(await getDashboardStats(preset));
  } catch (err) {
    return handleApiError(err);
  }
}
