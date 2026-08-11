// prisma/seed.ts
import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma, { UserRole } from '@/lib/prisma';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { handlePhone } from '@/utils/phone';

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

async function main() {
  await seedAdmin();
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
