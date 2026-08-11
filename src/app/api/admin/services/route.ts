// src/app/api/admin/services/route.ts
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
  serviceCreateSchema,
  servicesQuerySchema,
} from '@/validations/hotel-validation';
import { generateSlug } from '@/utils/generate-slug';
import { revalidatePublicFacilities } from '@/utils/revalidate';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const query = servicesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.ServiceWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.isPublished !== undefined
        ? { isPublished: query.isPublished }
        : {}),
    };

    const [services, totalItems] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      }),
      prisma.service.count({ where }),
    ]);

    return paginatedResponse(services, {
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
    const input = serviceCreateSchema.parse(await req.json());

    const service = await prisma.service.create({
      data: { ...input, slug: generateSlug(input.name) },
    });

    revalidatePublicFacilities(service.slug);
    return successResponse(service, 'Service created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
