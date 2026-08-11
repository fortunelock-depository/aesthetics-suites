// prisma/seed.ts
import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma, { UserRole } from '@/lib/prisma';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { handlePhone } from '@/utils/phone';
import { DEMO_REVIEWS, DEMO_ROOM_TYPES } from '@/static-data/demo-rooms';
import { FACILITIES, SERVICES, unsplash } from '@/static-data/home';

// The ADMIN_* variables are read here (not in src/config/env.ts) because only
// this script needs them. Keeping them out of the runtime ENV means the admin
// password never has to live in the production app environment.
function seedEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Seed requires env variable ${name}`);
  return v;
}

const seedEnabled = ['1', 'true', 'yes', 'on'].includes(
  (process.env.ADMIN_SEED_ENABLED ?? '').toLowerCase(),
);
const seedForceUpdate = ['1', 'true', 'yes', 'on'].includes(
  (process.env.ADMIN_SEED_FORCE_UPDATE ?? '').toLowerCase(),
);

async function seedAdmin() {
  if (!seedEnabled) {
    console.log('Admin seed skipped (ADMIN_SEED_ENABLED=false).');
    return;
  }

  const email = seedEnv('ADMIN_EMAIL').toLowerCase().trim();
  const password = seedEnv('ADMIN_PASSWORD');
  const fullname = seedEnv('ADMIN_FULLNAME');
  // Best-effort E.164 normalization; a garbage seed phone becomes unset.
  const phone =
    handlePhone(process.env.ADMIN_PHONE, { mode: 'parse' })?.e164Format ??
    undefined;

  // findFirst (not findUnique) so soft-deleted rows are excluded by the extension.
  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });

  if (existing && !seedForceUpdate) {
    console.log(
      `Admin seed: user already exists (${email}). No changes (force update disabled).`,
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: hashedPassword,
      fullname,
      role: UserRole.SUPER_ADMIN,
      ...(phone ? { phone } : {}),
    },
    update: {
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      deletedAt: null,
      ...(fullname ? { fullname } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  console.log(
    existing
      ? `Admin seed: updated admin (${email}) because ADMIN_SEED_FORCE_UPDATE=true.`
      : `Admin seed: created admin (${email}).`,
  );
}

const demoSeedEnabled = ['1', 'true', 'yes', 'on'].includes(
  (process.env.DEMO_SEED_ENABLED ?? '').toLowerCase(),
);

/**
 * Seeds demo room types + units + placeholder photos (DEMO_SEED_ENABLED).
 * For local development and staging demos - leave off in production once
 * real rooms exist.
 */
async function seedDemoRooms() {
  if (!demoSeedEnabled) {
    console.log('Demo room seed skipped (DEMO_SEED_ENABLED=false).');
    return;
  }

  const { generateSlug } = await import('@/utils/generate-slug');

  for (const [index, demo] of DEMO_ROOM_TYPES.entries()) {
    const { photo, units, ...fields } = demo;
    const roomType = await prisma.roomType.upsert({
      where: { name: fields.name },
      create: {
        ...fields,
        slug: generateSlug(fields.name),
        isPublished: true,
        sortOrder: index,
      },
      update: { ...fields, isPublished: true, sortOrder: index },
    });

    // Cover + a small gallery borrowed from the neighbouring rooms'
    // photos; replaced (not duplicated) on re-runs.
    const gallery = [
      photo,
      DEMO_ROOM_TYPES[(index + 1) % DEMO_ROOM_TYPES.length].photo,
      DEMO_ROOM_TYPES[(index + 2) % DEMO_ROOM_TYPES.length].photo,
    ];
    await prisma.roomPhoto.deleteMany({ where: { roomTypeId: roomType.id } });
    for (const [order, item] of gallery.entries()) {
      await prisma.roomPhoto.create({
        data: {
          roomTypeId: roomType.id,
          url: unsplash(item.id),
          alt: item.alt,
          sortOrder: order,
        },
      });
    }

    for (const unitName of units) {
      await prisma.room.upsert({
        where: { name: unitName },
        create: { roomTypeId: roomType.id, name: unitName },
        update: { roomTypeId: roomType.id, deletedAt: null },
      });
    }

    // A festive-peak season rate per room so the Rates tab has real
    // content: +40% nightly over the year-end holidays.
    const seasonName = 'Festive Peak';
    const existingRate = await prisma.seasonRate.findFirst({
      where: { roomTypeId: roomType.id, name: seasonName },
      select: { id: true },
    });
    const rateData = {
      roomTypeId: roomType.id,
      name: seasonName,
      startDate: new Date('2026-12-18'),
      endDate: new Date('2027-01-05'),
      nightlyPrice: Math.round(fields.basePrice * 1.4),
      minNights: 2,
    };
    if (existingRate) {
      await prisma.seasonRate.update({
        where: { id: existingRate.id },
        data: rateData,
      });
    } else {
      await prisma.seasonRate.create({ data: rateData });
    }

    // Reviews: the static demo set goes live as APPROVED, plus a PENDING
    // one on the first rooms so the moderation queue has real work.
    await prisma.review.deleteMany({ where: { roomTypeId: roomType.id } });
    for (const review of DEMO_REVIEWS[index] ?? []) {
      await prisma.review.create({
        data: {
          roomTypeId: roomType.id,
          guestName: review.guestName,
          guestEmail: `${review.guestName
            .toLowerCase()
            .replace(/[^a-z]+/g, '.')
            .replace(/^\.|\.$/g, '')}@example.com`,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: 'APPROVED',
          createdAt: new Date(review.createdAt),
        },
      });
    }
    if (index < 2) {
      await prisma.review.create({
        data: {
          roomTypeId: roomType.id,
          guestName: index === 0 ? 'Yaw B.' : 'Efua T.',
          guestEmail:
            index === 0 ? 'yaw.b@example.com' : 'efua.t@example.com',
          rating: index === 0 ? 4 : 5,
          title: index === 0 ? 'Solid stay overall' : 'Would come back',
          body:
            index === 0
              ? 'Comfortable room and friendly staff. The Wi-Fi dipped once in the evening but everything else was smooth from check-in to check-out.'
              : 'The lounge made our anniversary stay feel special, and breakfast was excellent every single morning. Genuinely hard to fault.',
          status: 'PENDING',
        },
      });
    }
  }

  console.log(
    `Demo room seed: upserted ${DEMO_ROOM_TYPES.length} room types with units, galleries, FAQs and season rates.`,
  );
}

/** Seeds the editorial facilities (DEMO_SEED_ENABLED), upsert-by-name. */
async function seedDemoFacilities() {
  if (!demoSeedEnabled) {
    console.log('Demo facility seed skipped (DEMO_SEED_ENABLED=false).');
    return;
  }

  const { generateSlug } = await import('@/utils/generate-slug');

  for (const [index, item] of FACILITIES.entries()) {
    const facility = await prisma.facility.upsert({
      where: { name: item.title },
      create: {
        name: item.title,
        slug: generateSlug(item.title),
        eyebrow: item.eyebrow,
        summary: item.description,
        description: item.longDescription.join('\n\n'),
        openingHours: item.openingHours,
        highlights: [...item.highlights],
        isPublished: true,
        sortOrder: index,
      },
      update: {
        eyebrow: item.eyebrow,
        summary: item.description,
        description: item.longDescription.join('\n\n'),
        openingHours: item.openingHours,
        highlights: [...item.highlights],
        isPublished: true,
        sortOrder: index,
        deletedAt: null,
      },
    });

    await prisma.facilityPhoto.deleteMany({
      where: { facilityId: facility.id },
    });
    const photos = [item.image, ...item.gallery];
    for (const [order, photo] of photos.entries()) {
      await prisma.facilityPhoto.create({
        data: {
          facilityId: facility.id,
          url: photo.src,
          alt: photo.alt,
          sortOrder: order,
        },
      });
    }
  }

  console.log(
    `Demo facility seed: upserted ${FACILITIES.length} facilities with photos.`,
  );
}

/** Seeds the editorial services (DEMO_SEED_ENABLED), upsert-by-name. */
async function seedDemoServices() {
  if (!demoSeedEnabled) {
    console.log('Demo service seed skipped (DEMO_SEED_ENABLED=false).');
    return;
  }

  const { generateSlug } = await import('@/utils/generate-slug');

  for (const [index, item] of SERVICES.entries()) {
    const service = await prisma.service.upsert({
      where: { name: item.title },
      create: {
        name: item.title,
        slug: generateSlug(item.title),
        eyebrow: item.eyebrow,
        summary: item.description,
        description: item.longDescription.join('\n\n'),
        availability: item.availability,
        highlights: [...item.highlights],
        isPublished: true,
        sortOrder: index,
      },
      update: {
        eyebrow: item.eyebrow,
        summary: item.description,
        description: item.longDescription.join('\n\n'),
        availability: item.availability,
        highlights: [...item.highlights],
        isPublished: true,
        sortOrder: index,
        deletedAt: null,
      },
    });

    await prisma.servicePhoto.deleteMany({ where: { serviceId: service.id } });
    const photos = [item.image, ...item.gallery];
    for (const [order, photo] of photos.entries()) {
      await prisma.servicePhoto.create({
        data: {
          serviceId: service.id,
          url: photo.src,
          alt: photo.alt,
          sortOrder: order,
        },
      });
    }
  }

  console.log(
    `Demo service seed: upserted ${SERVICES.length} services with photos.`,
  );
}

async function main() {
  await seedAdmin();
  await seedDemoRooms();
  await seedDemoFacilities();
  await seedDemoServices();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
