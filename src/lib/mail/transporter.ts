// src/lib/mail/transporter.ts
import 'server-only';
import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '@/config/env';

let cachedTransporter: Transporter | null = null;

const isEmailConfigured = (): boolean =>
  // Host has a Gmail default, so credentials are the real gate.
  Boolean(ENV.SMTP_USER && ENV.SMTP_PASSWORD);

/**
 * Lazily builds (and caches) the SMTP transporter (agritrade pattern), or
 * returns null when credentials are not set - callers fall back to console
 * logging in that case, so local development works without email.
 */
export const getTransporter = (): Transporter | null => {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE === 'true',
    // On the STARTTLS path (587), demand that the upgrade actually happens.
    // Without this nodemailer will quietly continue in cleartext if the
    // server does not advertise STARTTLS, and this channel carries
    // password-reset links and 2FA codes.
    requireTLS: ENV.SMTP_SECURE !== 'true',
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASSWORD,
    },
    // Fail fast instead of hanging: with a single pooled connection, one
    // stalled socket would otherwise block every queued message.
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    rateDelta: 1000,
    rateLimit: 1,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return cachedTransporter;
};
