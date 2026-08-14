// src/config/env.ts

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env variable: ${name}`);
  return v;
}

/**
 * Required secret with a minimum length so a placeholder or truncated value
 * fails at startup instead of silently weakening signing/encryption.
 */
function requiredSecret(name: string, minLength = 32): string {
  const v = required(name);
  if (v.length < minLength) {
    throw new Error(
      `Env variable ${name} must be at least ${minLength} characters (got ${v.length}). ` +
        `Generate one with: openssl rand -hex 32`,
    );
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v?.length ? v : undefined;
}

const IS_PRODUCTION = (optional('NODE_ENV') ?? 'development') === 'production';

export const ENV = {
  NODE_ENV: optional('NODE_ENV') ?? 'development',
  IS_PRODUCTION,

  DATABASE_URL: required('DATABASE_URL'),

  SESSION_SECRET: requiredSecret('SESSION_SECRET'),

  // Public site origin - canonical URLs, sitemap, OG URLs, and absolute links
  // in emails (password reset). REQUIRED in production (a silent localhost
  // fallback would break every emailed link and the Paystack return leg);
  // the localhost fallback exists for development only.
  BASE_URL: IS_PRODUCTION
    ? required('NEXT_PUBLIC_BASE_URL')
    : (optional('NEXT_PUBLIC_BASE_URL') ?? 'http://localhost:3000'),

  // SMTP - optional (agritrade pattern). When unset, the mail layer logs
  // codes/links to the server console instead of sending email (fine for
  // local development). Gmail works with host smtp.gmail.com + app password.
  SMTP_HOST: optional('SMTP_HOST') ?? 'smtp.gmail.com',
  SMTP_PORT: Number(optional('SMTP_PORT') ?? '587'),
  SMTP_USER: optional('SMTP_USER'),
  SMTP_PASSWORD: optional('SMTP_PASSWORD'),
  /** 'true' for implicit TLS (port 465); STARTTLS on 587 leaves it 'false'. */
  SMTP_SECURE: optional('SMTP_SECURE') ?? 'false',
  EMAIL_FROM_NAME:
    optional('EMAIL_FROM_NAME') ??
    optional('MAIL_FROM_NAME') ??
    'Aesthetics Suites',
  /** From address override; defaults to SMTP_USER. */
  MAIL_FROM_EMAIL: optional('MAIL_FROM_EMAIL'),
  /**
   * Hosted logo shown in email headers. Defaults to the site's own
   * /logo-mark.png, which inboxes can only fetch once deployed - a CDN
   * URL (e.g. Cloudinary) works immediately.
   */
  EMAIL_LOGO_URL: optional('EMAIL_LOGO_URL'),

  // Shared secret for the housekeeping cron route (hold expiry + Airbnb
  // iCal sync). Required to call /api/cron/housekeeping.
  CRON_SECRET: optional('CRON_SECRET'),

  // Cloudinary - image uploads. Optional so the app boots without them; the
  // upload service validates (and fails clearly) at call time when unset.
  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET'),
  CLOUDINARY_FOLDER: optional('CLOUDINARY_FOLDER') ?? 'aesthetics-suites',

  // Cloudflare Turnstile - bot protection on public forms. Optional: when
  // unset, verification is skipped (dev) and forms rely on the honeypot.
  TURNSTILE_SECRET_KEY: optional('TURNSTILE_SECRET_KEY'),

  // Paystack - room-booking payments. Optional so the app boots without
  // them; the payment service fails clearly at call time when unset.
  PAYSTACK_SECRET_KEY: optional('PAYSTACK_SECRET_KEY'),
  /**
   * Where Paystack redirects the guest after paying. Defaults to
   * BASE_URL/payments/verify; set explicitly in production so a proxy or
   * custom domain can never break the return leg.
   */
  PAYSTACK_CALLBACK_URL: optional('PAYSTACK_CALLBACK_URL'),
  PAYSTACK_PUBLIC_KEY: optional('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'),

  // Dev mail seams. MAIL_FORCE_TO reroutes EVERY outgoing email to one
  // inbox (sample sends, staging smoke tests); MAIL_PREVIEW_DIR renders
  // emails to disk instead of sending. Both are IGNORED in production -
  // a copied .env must never silently swallow real guest email.
  MAIL_FORCE_TO: IS_PRODUCTION ? undefined : optional('MAIL_FORCE_TO'),
  MAIL_PREVIEW_DIR: IS_PRODUCTION ? undefined : optional('MAIL_PREVIEW_DIR'),

  // Upstash Redis. Optional in development (in-memory limiter is correct for
  // a single local process) but REQUIRED in production: on serverless each
  // instance has its own memory, so an in-memory limiter provides no real
  // protection. The rate limiter fails closed when these are missing in
  // production - see src/lib/rate-limit.ts.
  UPSTASH_REDIS_REST_URL: optional('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: optional('UPSTASH_REDIS_REST_TOKEN'),
} as const;
