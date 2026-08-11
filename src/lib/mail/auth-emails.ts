// src/lib/mail/auth-emails.ts
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { getTransporter } from './transporter';
import { shell } from './email-shell';
import {
  TWO_FACTOR_CODE_TTL_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
} from '@/utils/user-security-tokens';

type Recipient = { id: string; fullname: string; email: string };

const from = () => `"${ENV.EMAIL_FROM_NAME}" <${ENV.GMAIL_USER}>`;

/**
 * Sends an email, or - when Gmail isn't configured - logs it to the server
 * console so local development works without SMTP. Fire-and-forget: failures
 * are logged and swallowed so mail issues never block or leak account state.
 */
async function deliver(opts: {
  to: string;
  subject: string;
  html: string;
  devConsole: string;
}): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback - no email configured.
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
    });
  } catch (error) {
    logger.error({ error }, `Failed to send email "${opts.subject}"`);
  }
}

const codeBlock = (code: string): string => `
  <div style="background-color:#F3F1D9;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:5px;margin:20px 0;border-radius:8px;">
    ${code}
  </div>`;

export const sendTwoFactorCodeEmail = async (
  user: Recipient,
  code: string,
  purpose: 'login' | 'setup',
): Promise<void> => {
  const title =
    purpose === 'login' ? 'Your Login Code' : 'Confirm Two-Factor Setup';
  const line =
    purpose === 'login'
      ? 'Use the code below to finish signing in to the admin console:'
      : 'Use the code below to confirm enabling two-factor authentication:';

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">${title}</h2>
    <p style="margin:0 0 16px;">Hi ${user.fullname},</p>
    <p style="margin:0 0 16px;">${line}</p>
    ${codeBlock(code)}
    <p style="margin:0 0 16px;">This code expires in ${TWO_FACTOR_CODE_TTL_MINUTES} minutes.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
  `);

  await deliver({
    to: user.email,
    subject: `${title} - ${ENV.EMAIL_FROM_NAME}`,
    html,
    devConsole: `2FA ${purpose} code: ${code}  (expires in ${TWO_FACTOR_CODE_TTL_MINUTES} min)`,
  });
};

export const sendPasswordResetEmail = async (
  user: Recipient,
  resetUrl: string,
): Promise<void> => {
  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">Reset Your Password</h2>
    <p style="margin:0 0 16px;">Hi ${user.fullname},</p>
    <p style="margin:0 0 16px;">We received a request to reset the password for your admin account.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#252A1C;color:#fff;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none;">Reset Password</a>
    </div>
    <p style="margin:0 0 16px;">This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.</p>
    <p style="margin:0 0 8px;">If the button doesn't work, paste this link into your browser:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#555;">${resetUrl}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email - your password will not change.</p>
  `);

  await deliver({
    to: user.email,
    subject: `Reset your password - ${ENV.EMAIL_FROM_NAME}`,
    html,
    devConsole: `Password reset link: ${resetUrl}  (expires in ${PASSWORD_RESET_TTL_MINUTES} min)`,
  });
};

export const sendPasswordChangedEmail = async (
  user: Recipient,
): Promise<void> => {
  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">Password Changed</h2>
    <p style="margin:0 0 16px;">Hi ${user.fullname},</p>
    <p style="margin:0 0 16px;">This confirms the password for your admin account was just changed.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">If this was <strong>not</strong> you, contact an administrator immediately.</p>
  `);

  await deliver({
    to: user.email,
    subject: `Your password was changed - ${ENV.EMAIL_FROM_NAME}`,
    html,
    devConsole: 'Password-changed notice (no action needed).',
  });
};
