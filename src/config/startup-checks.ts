// src/config/startup-checks.ts
//
// Production misconfiguration that is dangerous BECAUSE it is silent. These
// run once per instance (module init) and are imported from hot paths, so a
// cold start surfaces them in the logs instead of leaving a feature quietly
// dead. Nothing here throws: a boot that dies takes the whole site down,
// which is worse than a loud log line.
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';

// CRON_SECRET is what makes the housekeeping route callable at all - the
// route fails closed without it, which is safe but SILENT: no hold sweeps,
// no Airbnb sync, no lifecycle email ever runs, and the only symptom is
// 401s in a log nobody reads.
if (ENV.IS_PRODUCTION && !ENV.CRON_SECRET) {
  logger.fatal(
    'CRON_SECRET is unset in production: housekeeping will reject every run (no hold expiry, no Airbnb calendar sync, no lifecycle emails)',
  );
}

// Rate limiting is the only thing that needs Upstash, and it fails CLOSED
// without it: protected flows reject every request rather than run
// unguarded. That is the safe direction but a terrible surprise, so say it
// loudly at boot. (lib/rate-limit.ts logs the same fact from its own
// selection logic; this covers instances that reach the check first.)
if (ENV.IS_PRODUCTION && !ENV.UPSTASH_REDIS_REST_URL) {
  logger.fatal(
    'UPSTASH_REDIS_REST_URL is unset in production: rate limiting fails closed, so login, booking and contact flows will reject every request',
  );
}

export {};
