// src/lib/rate-limiter.ts
//
// Pure rate-limiter implementations and selection logic. No env access here -
// src/lib/rate-limit.ts wires this to ENV/Upstash. Kept side-effect-free so
// the selection rules are unit-testable.

export const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

/**
 * Browse endpoints (availability quotes, public listings) get a far looser
 * budget than credential flows: the goal is capping abuse and the outbound
 * work a quote triggers, not stopping password guessing. One guest sizing
 * up several date ranges is normal traffic.
 */
export const BROWSE_RATE_LIMIT = 60;

export interface LimitResult {
  success: boolean;
  /** Epoch ms when the window resets. */
  reset: number;
  remaining: number;
  limit: number;
}

export interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

/**
 * In-memory sliding-window limiter. Correct for a single long-lived process
 * (local dev). In serverless production each instance has its own memory, so
 * a shared store (Upstash) is required instead - see selectLimiter.
 */
export function createInMemoryLimiter(limit: number = RATE_LIMIT): Limiter {
  const hits = new Map<string, number[]>();

  return {
    async limit(key: string): Promise<LimitResult> {
      const now = Date.now();
      const windowStart = now - RATE_WINDOW_MS;

      const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
      timestamps.push(now);
      hits.set(key, timestamps);

      // Opportunistic cleanup so the map doesn't grow unbounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) {
          if (v.every((t) => t <= windowStart)) hits.delete(k);
        }
      }

      const count = timestamps.length;
      const oldest = timestamps[0] ?? now;

      return {
        success: count <= limit,
        reset: oldest + RATE_WINDOW_MS,
        remaining: Math.max(limit - count, 0),
        limit,
      };
    },
  };
}

/**
 * Allow-everything limiter for BROWSE endpoints when no shared store is
 * configured. Credential flows fail closed because a missing cache must
 * never quietly weaken brute-force protection; a public availability quote
 * is the opposite trade - refusing every visitor because Upstash is
 * unconfigured takes the whole site down to prevent nothing worse than
 * extra database reads. The misconfiguration is already logged fatally by
 * the shared selection.
 */
export function createAllowAllLimiter(limit: number = RATE_LIMIT): Limiter {
  return {
    async limit(): Promise<LimitResult> {
      return {
        success: true,
        reset: Date.now() + RATE_WINDOW_MS,
        remaining: limit,
        limit,
      };
    },
  };
}

/**
 * Fail-closed limiter: denies every request. Used when production is missing
 * a shared store - brute-force protection must never silently degrade to
 * per-instance memory, so protected flows stay blocked until Upstash is
 * configured.
 */
export function createFailClosedLimiter(): Limiter {
  return {
    async limit(): Promise<LimitResult> {
      return {
        success: false,
        reset: Date.now() + RATE_WINDOW_MS,
        remaining: 0,
        limit: RATE_LIMIT,
      };
    },
  };
}

export type LimiterSelection =
  | { kind: 'upstash' }
  | { kind: 'memory' }
  | { kind: 'fail-closed'; reason: string };

/**
 * Decides which limiter backs rate limiting:
 * - Upstash configured: shared limiter (any environment).
 * - No Upstash in development: in-memory (single process, correct enough).
 * - No Upstash in production: fail closed. Never fail open.
 */
export function selectLimiter(config: {
  isProduction: boolean;
  hasUpstash: boolean;
}): LimiterSelection {
  if (config.hasUpstash) return { kind: 'upstash' };
  if (!config.isProduction) return { kind: 'memory' };
  return {
    kind: 'fail-closed',
    reason:
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
      'In production an in-memory limiter is per-instance and provides no real ' +
      'protection, so rate-limited flows are blocked until Upstash is configured.',
  };
}
