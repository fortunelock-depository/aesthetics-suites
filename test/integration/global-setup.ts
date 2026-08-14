// test/integration/global-setup.ts
//
// Runs once before the integration suite. Ensures the dedicated test
// database exists and is migrated to the current schema (including the
// btree_gist extension the Booking_no_unit_overlap constraint needs).
// Idempotent - safe to re-run.
import { execSync } from 'node:child_process';
import { Client } from 'pg';

try {
  process.loadEnvFile('.env');
} catch {
  // CI provides env directly.
}

const testDbUrl = process.env.TEST_DATABASE_URL ?? '';

function dbNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}

export async function setup(): Promise<void> {
  if (!testDbUrl) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a LOCAL Postgres test ' +
        'database (e.g. postgresql://user:pass@localhost:5432/aesthetics_test); ' +
        'it is created and migrated automatically.',
    );
  }

  const dbName = dbNameOf(testDbUrl);
  const maintenanceUrl = new URL(testDbUrl);
  maintenanceUrl.pathname = '/postgres';

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }

  // `migrate deploy` is idempotent and applies the exclusion-constraint
  // migration (CREATE EXTENSION btree_gist - trusted since Postgres 13,
  // so the database owner may install it without superuser).
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });
}
