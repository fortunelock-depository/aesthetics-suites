// src/app/api/users/route.ts
import type { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import type { Prisma } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/api-auth';
import {
  paginatedResponse,
  successResponse,
  handleApiError,
} from '@/utils/api-response';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import {
  usersQuerySchema,
  createUserSchema,
} from '@/validations/user-validation';

const userSelect = {
  id: true,
  email: true,
  fullname: true,
  phone: true,
  role: true,
  twoFactorEnabled: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const query = usersQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              { fullname: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
    };

    const [users, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(users, {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Creates a staff account (SUPER_ADMIN only - the RBAC boundary). */
export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const input = createUserSchema.parse(await req.json());
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        fullname: input.fullname,
        phone: input.phone,
        role: input.role,
        password: await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS),
      },
      select: userSelect,
    });

    return successResponse(user, 'User created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
