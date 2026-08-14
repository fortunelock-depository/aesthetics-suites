// src/lib/mail/deliver.ts
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { getTransporter } from './transporter';

const from = () =>
  `"${ENV.EMAIL_FROM_NAME}" <${ENV.MAIL_FROM_EMAIL ?? ENV.SMTP_USER}>`;

/**
 * Sends an email, or - when SMTP isn't configured - logs it to the server
 * console so local development works without email. Returns whether the
 * message was actually handed to the transport: notification mail ignores
 * the result (failures must never block a flow), but auth flows (reset
 * links, OTPs) surface a failure to the user instead of a silent wait for
 * an email that never comes.
 */
export async function deliver(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  devConsole: string;
}): Promise<boolean> {
  // Dev mail trap (ignored in production - see ENV): route EVERY email to
  // one inbox without touching real guest addresses.
  const to = ENV.MAIL_FORCE_TO ?? opts.to;

  // Dev preview seam: render every email to disk instead of sending, so
  // templates can be reviewed in a browser (MAIL_PREVIEW_DIR=… script).
  if (ENV.MAIL_PREVIEW_DIR) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const dir = ENV.MAIL_PREVIEW_DIR;
    await mkdir(dir, { recursive: true });
    const slug = opts.subject
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const meta = `<div style="background:#1E2118;color:#FFF9E2;font-family:monospace;font-size:12px;padding:10px 16px;">PREVIEW · To: ${opts.to} · Subject: ${opts.subject}${opts.replyTo ? ` · Reply-To: ${opts.replyTo}` : ''}</div>`;
    await writeFile(join(dir, `${slug}.html`), meta + opts.html);
    return true;
  }

  const transporter = getTransporter();

  if (!transporter) {
    logger.info(
      `\n──────── DEV EMAIL (no SMTP configured) ────────\nTo: ${opts.to}\nSubject: ${opts.subject}\n${opts.devConsole}\n────────────────────────────────────────────────\n`,
    );
    return true;
  }

  try {
    await transporter.sendMail({
      from: from(),
      to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    return true;
  } catch (error) {
    logger.error({ error }, `Failed to send email "${opts.subject}"`);
    return false;
  }
}

/** Emails of active admin accounts (contact + booking notifications). */
export async function adminRecipients(): Promise<string[]> {
  // Imported lazily to keep this module usable in isolation.
  const { default: prisma, UserRole } = await import('@/lib/prisma');
  const admins = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    select: { email: true },
  });
  return admins.map((admin) => admin.email);
}
