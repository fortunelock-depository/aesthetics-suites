// src/utils/client-ip.test.ts
import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

const headersOf = (entries: Record<string, string>) => new Headers(entries);

describe('clientIp', () => {
  it('prefers the platform-set x-real-ip', () => {
    expect(
      clientIp(
        headersOf({
          'x-real-ip': '203.0.113.9',
          'x-forwarded-for': '198.51.100.1, 203.0.113.9',
        }),
      ),
    ).toBe('203.0.113.9');
  });

  it('falls back to the RIGHTMOST x-forwarded-for entry', () => {
    // The leftmost entry is client-supplied on non-overwriting proxies -
    // an attacker rotating it must not rotate their rate-limit bucket.
    expect(
      clientIp(headersOf({ 'x-forwarded-for': 'spoofed, 203.0.113.9' })),
    ).toBe('203.0.113.9');
  });

  it('shares one bucket when no header is present', () => {
    expect(clientIp(headersOf({}))).toBe('unknown');
  });
});
