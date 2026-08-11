// src/lib/rate-limiter.test.ts
import { describe, expect, it } from 'vitest';
import {
  createFailClosedLimiter,
  createInMemoryLimiter,
  selectLimiter,
  RATE_LIMIT,
} from './rate-limiter';

describe('selectLimiter', () => {
  it('uses Upstash whenever it is configured', () => {
    expect(
      selectLimiter({ isProduction: true, hasUpstash: true }).kind,
    ).toBe('upstash');
    expect(
      selectLimiter({ isProduction: false, hasUpstash: true }).kind,
    ).toBe('upstash');
  });

  it('falls back to memory only outside production', () => {
    expect(
      selectLimiter({ isProduction: false, hasUpstash: false }).kind,
    ).toBe('memory');
  });

  it('fails closed in production without Upstash', () => {
    const selection = selectLimiter({ isProduction: true, hasUpstash: false });
    expect(selection.kind).toBe('fail-closed');
  });
});

describe('createInMemoryLimiter', () => {
  it('allows up to the limit then denies within the window', async () => {
    const limiter = createInMemoryLimiter();

    for (let i = 0; i < RATE_LIMIT; i++) {
      const result = await limiter.limit('ip-1');
      expect(result.success).toBe(true);
    }

    const denied = await limiter.limit('ip-1');
    expect(denied.success).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it('tracks keys independently', async () => {
    const limiter = createInMemoryLimiter();
    for (let i = 0; i < RATE_LIMIT; i++) await limiter.limit('ip-1');

    const other = await limiter.limit('ip-2');
    expect(other.success).toBe(true);
  });
});

describe('createFailClosedLimiter', () => {
  it('denies every request', async () => {
    const limiter = createFailClosedLimiter();
    const result = await limiter.limit('anything');
    expect(result.success).toBe(false);
  });
});
