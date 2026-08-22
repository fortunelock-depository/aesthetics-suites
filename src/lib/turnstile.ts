// src/lib/turnstile.ts
//
// Cloudflare Turnstile server-side verification. Env-gated: when
// TURNSTILE_SECRET_KEY is unset (dev), verification is skipped so local
// flows aren't blocked. When configured it fails CLOSED - a missing or
// invalid token, or an unreachable Cloudflare, is "not a human".
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const verifyTurnstile = async (
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> => {
  const secret = ENV.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured -> verification disabled
  if (!token) return false;

  try {
    const body = new URLSearchParams({ response: token, secret });
    if (remoteIp) body.append('remoteip', remoteIp);
    // Runs inline in every public-form request, so cap the wait: a stalled
    // Cloudflare must not hang the request. The abort is caught below and
    // fails closed like any other error.
    const res = await fetch(SITEVERIFY_URL, {
      body,
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch (error) {
    logger.error({ error }, 'Turnstile verification failed');
    return false; // fail closed (includes the 5s abort timeout)
  }
};
