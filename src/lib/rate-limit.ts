// src/lib/rate-limit.ts
import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { ENV } from '@/config/env';
import { getRedis, hasRedis } from '@/lib/redis';
import logger from '@/utils/logger';
import {
  createAllowAllLimiter,
  createFailClosedLimiter,
  createInMemoryLimiter,
  selectLimiter,
  BROWSE_RATE_LIMIT,
  RATE_LIMIT,
  type Limiter,
} from '@/lib/rate-limiter';
import '@/config/startup-checks';

export type { Limiter, LimitResult } from '@/lib/rate-limiter';

function createUpstashLimiter(max: number, prefix: string): Limiter {
  const redis = getRedis()!;

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, '60s'),
    analytics: true,
    prefix: `aesthetics-suites:${prefix}`,
  });

  return {
    async limit(key: string) {
      const { success, reset, remaining, limit } = await rl.limit(key);
      return { success, reset, remaining, limit };
    },
  };
}

const selection = selectLimiter({
  isProduction: ENV.IS_PRODUCTION,
  hasUpstash: hasRedis(),
});

if (selection.kind === 'fail-closed') {
  logger.fatal(
    { reason: selection.reason },
    'Rate limiting is FAIL-CLOSED: protected flows will reject all requests',
  );
}

export const ratelimit: Limiter =
  selection.kind === 'upstash'
    ? createUpstashLimiter(RATE_LIMIT, 'auth')
    : selection.kind === 'memory'
      ? createInMemoryLimiter()
      : createFailClosedLimiter();

/**
 * Throttle for public browse endpoints. Same store, looser budget, and it
 * degrades to allow-all rather than fail-closed - see createAllowAllLimiter
 * for why a misconfigured cache must not blank the public site.
 */
export const browseRatelimit: Limiter =
  selection.kind === 'upstash'
    ? createUpstashLimiter(BROWSE_RATE_LIMIT, 'browse')
    : selection.kind === 'memory'
      ? createInMemoryLimiter(BROWSE_RATE_LIMIT)
      : createAllowAllLimiter(BROWSE_RATE_LIMIT);
