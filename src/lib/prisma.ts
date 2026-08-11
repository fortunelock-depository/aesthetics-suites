// src/lib/prisma.ts
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV } from '@/config/env';

// ENV.DATABASE_URL is validated at startup, so a missing value fails fast
// with a clear message instead of surfacing later as a pool error.
const adapter = new PrismaPg({ connectionString: ENV.DATABASE_URL });

/**
 * Soft-delete extension for models that carry a `deletedAt` column
 * (user, roomType, room, discount, review, facility, service).
 *
 * - `delete` / `deleteMany` are rewritten to set `deletedAt` instead of
 *   physically removing the row.
 * - `findMany` / `findFirst` / `count` default to excluding soft-deleted rows
 *   (pass `deletedAt` explicitly in `where` to include them).
 *
 * `findUnique` is intentionally NOT filtered - Prisma only allows unique
 * fields in its `where`. Use `findFirst` when you need a soft-delete-aware
 * lookup. When a new model gains a `deletedAt` column, add its block here.
 */
function withSoftDelete(base: PrismaClient) {
  return base.$extends({
    name: 'soft-delete',
    query: {
      user: {
        delete: ({ args }) =>
          base.user.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.user.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      roomType: {
        delete: ({ args }) =>
          base.roomType.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.roomType.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      room: {
        delete: ({ args }) =>
          base.room.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.room.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      discount: {
        delete: ({ args }) =>
          base.discount.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.discount.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      facility: {
        delete: ({ args }) =>
          base.facility.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.facility.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      service: {
        delete: ({ args }) =>
          base.service.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.service.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      review: {
        delete: ({ args }) =>
          base.review.update({
            where: args.where,
            data: { deletedAt: new Date() },
          }),
        deleteMany: ({ args }) =>
          base.review.updateMany({
            where: args.where ?? {},
            data: { deletedAt: new Date() },
          }),
        findMany: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        findFirst: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
        count: ({ args, query }) => {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
    },
  });
}

const createPrismaClient = () => withSoftDelete(new PrismaClient({ adapter }));

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

export * from '../../generated/prisma/client';
