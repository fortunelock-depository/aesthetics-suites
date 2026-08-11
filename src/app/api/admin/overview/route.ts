// src/app/api/admin/overview/route.ts
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/api-auth';
import { getDashboardStats } from '@/lib/hotel/dashboard-service';
import { dateOnly } from '@/validations/hotel-validation';
import { successResponse, handleApiError } from '@/utils/api-response';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const querySchema = z
  .object({
    preset: z
      .enum([
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'LAST_MONTH',
        'LAST_90_DAYS',
        'THIS_YEAR',
        'CUSTOM',
      ])
      .default('THIS_MONTH'),
    /** CUSTOM only: inclusive calendar dates. */
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .refine(
    (query) =>
      query.preset !== 'CUSTOM' ||
      (query.from !== undefined &&
        query.to !== undefined &&
        query.to >= query.from),
    { message: 'A custom range needs from and to dates (to >= from)' },
  );

/** The rich dashboard payload (dms-style: range cards w/ trends + ops). */
export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const query = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    // Inclusive to-date -> the half-open [start, end) everything else uses.
    const custom =
      query.preset === 'CUSTOM' && query.from && query.to
        ? {
            start: new Date(`${query.from}T00:00:00.000Z`),
            end: new Date(
              new Date(`${query.to}T00:00:00.000Z`).getTime() + MS_PER_DAY,
            ),
          }
        : undefined;

    return successResponse(await getDashboardStats(query.preset, custom));
  } catch (err) {
    return handleApiError(err);
  }
}
