// src/lib/redis.ts
//
// One shared Upstash client for the things that need cross-instance state -
// today that is rate limiting. Serverless gives every instance its own
// memory, so anything that must be true "once across the whole deployment"
// has to live here rather than in a module variable. (Housekeeping does not:
// it coordinates with a Postgres advisory lock on a connection it is already
// using, which costs nothing extra.)
import 'server-only';
import { Redis } from '@upstash/redis';
import { ENV } from '@/config/env';

let client: Redis | null | undefined;

/** True when both Upstash credentials are present. */
export function hasRedis(): boolean {
  return (
    Boolean(ENV.UPSTASH_REDIS_REST_URL) && Boolean(ENV.UPSTASH_REDIS_REST_TOKEN)
  );
}

/**
 * The shared client, or null when Upstash is not configured (local dev).
 * Callers must treat null as "this coordination is unavailable" and degrade
 * deliberately - never as "go ahead".
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  client = hasRedis()
    ? new Redis({
        url: ENV.UPSTASH_REDIS_REST_URL!,
        token: ENV.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;
  return client;
}
