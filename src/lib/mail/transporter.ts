// src/lib/mail/transporter.ts
import 'server-only';
import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '@/config/env';

let cachedTransporter: Transporter | null = null;

export const isEmailConfigured = (): boolean =>
  Boolean(ENV.GMAIL_USER && ENV.GMAIL_PASSWORD);

/**
 * Lazily builds (and caches) the Gmail SMTP transporter, or returns null when
 * credentials are not set. Callers fall back to console logging in that case
 * (see auth-emails) - handy for local development without email configured.
 */
export const getTransporter = (): Transporter | null => {
  if (!isEmailConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ENV.GMAIL_USER,
      pass: ENV.GMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  return cachedTransporter;
};
