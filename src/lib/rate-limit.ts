// src/lib/rate-limit.ts
import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import {
  createFailClosedLimiter,
  createInMemoryLimiter,
  selectLimiter,
  RATE_LIMIT,
  type Limiter,
} from '@/lib/rate-limiter';

export type { Limiter, LimitResult } from '@/lib/rate-limiter';

function createUpstashLimiter(): Limiter {
  const redis = new Redis({
    url: ENV.UPSTASH_REDIS_REST_URL!,
    token: ENV.UPSTASH_REDIS_REST_TOKEN!,
  });

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT, '60s'),
    analytics: true,
    prefix: 'aesthetics-suites:auth',
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
  hasUpstash:
    Boolean(ENV.UPSTASH_REDIS_REST_URL) &&
    Boolean(ENV.UPSTASH_REDIS_REST_TOKEN),
});

if (selection.kind === 'fail-closed') {
  logger.fatal(
    { reason: selection.reason },
    'Rate limiting is FAIL-CLOSED: protected flows will reject all requests',
  );
}

export const ratelimit: Limiter =
  selection.kind === 'upstash'
    ? createUpstashLimiter()
    : selection.kind === 'memory'
      ? createInMemoryLimiter()
      : createFailClosedLimiter();
