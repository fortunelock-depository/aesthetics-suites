// src/utils/client-ip.ts

/**
 * The client IP for rate-limit keying.
 *
 * Trust model: on Vercel (the deployment target) the platform overwrites
 * x-real-ip and x-forwarded-for with values it derived itself, so neither
 * can be spoofed by the caller. Behind any other proxy, that proxy must
 * strip or overwrite these headers, or every limiter keyed by IP becomes a
 * no-op for an attacker who rotates the header.
 *
 * Preference order: x-real-ip (single value, platform-set), else the
 * RIGHTMOST x-forwarded-for entry (the hop closest to us - the leftmost is
 * client-supplied on non-overwriting proxies), else a shared fallback key
 * so absent headers still share one bucket instead of bypassing limits.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const rightmost = parts[parts.length - 1]?.trim();
    if (rightmost) return rightmost;
  }

  return 'unknown';
}
