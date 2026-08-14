// vitest.integration.config.ts
//
// Real-database integration suite (test/integration/**). Kept separate from
// the unit config so `npm run test:unit` stays instant and DB-free while
// this config gets the sequential, single-fork execution a shared Postgres
// database requires.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Load .env (Node 24 built-in) so TEST_DATABASE_URL is available locally.
// CI has no .env file - the workflow sets TEST_DATABASE_URL directly.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env (CI) - env comes from the workflow.
}

const testDbUrl = process.env.TEST_DATABASE_URL ?? '';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // `import 'server-only'` throws outside a React Server environment;
      // the services under test import it as a build-time guard only.
      'server-only': path.resolve(__dirname, 'test/helpers/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    // Pin every env var the code under test reads - tests must never see
    // the developer's real .env values (khadys/agritrade convention).
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
      SESSION_SECRET: 'vitest-only-session-secret-0123456789abcdef',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      // Known secret so webhook-signature tests can sign deterministically.
      PAYSTACK_SECRET_KEY: 'sk_test_vitest',
      // Explicitly unset: in-memory limiter in test, no SMTP (mail layer is
      // mocked anyway), no mail traps, no cron secret needed at this layer.
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
      MAIL_FORCE_TO: '',
      MAIL_PREVIEW_DIR: '',
      CRON_SECRET: '',
    },
    // One shared database, reset between tests - never run files in
    // parallel (each file's worker still gets its own Prisma pool and
    // disconnects in afterAll).
    fileParallelism: false,
    globalSetup: ['./test/integration/global-setup.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
