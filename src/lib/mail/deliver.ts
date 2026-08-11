// src/lib/mail/deliver.ts
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { getTransporter } from './transporter';

const from = () =>
  `"${ENV.EMAIL_FROM_NAME}" <${ENV.MAIL_FROM_EMAIL ?? ENV.GMAIL_USER}>`;

/**
 * Sends an email, or - when SMTP isn't configured - logs it to the server
 * console so local development works without email. Fire-and-forget:
 * failures are logged and swallowed so mail issues never block a flow.
 */
export async function deliver(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  devConsole: string;
}): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    logger.info(
      `\n──────── DEV EMAIL (no SMTP configured) ────────\nTo: ${opts.to}\nSubject: ${opts.subject}\n${opts.devConsole}\n────────────────────────────────────────────────\n`,
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: from(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
  } catch (error) {
    logger.error({ error }, `Failed to send email "${opts.subject}"`);
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
