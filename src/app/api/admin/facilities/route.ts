// src/app/api/admin/facilities/route.ts
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import {
  facilityCreateSchema,
  facilitiesQuerySchema,
} from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicFacilities } from '@/utils/revalidate';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = facilitiesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.FacilityWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.isPublished !== undefined
        ? { isPublished: query.isPublished }
        : {}),
    };

    const [facilities, totalItems] = await Promise.all([
      prisma.facility.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      }),
      prisma.facility.count({ where }),
    ]);

    return paginatedResponse(facilities, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = facilityCreateSchema.parse(await req.json());

    const facility = await prisma.facility.create({
      data: { ...input, slug: generateSlug(input.name) },
    });

    revalidatePublicFacilities(facility.slug);
    return successResponse(facility, 'Facility created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
