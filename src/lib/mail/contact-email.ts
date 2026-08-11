// src/lib/mail/contact-email.ts
//
// Contact-form mail: the message goes straight to the admins' inboxes and
// the sender gets an acknowledgement. Nothing is stored - email IS the
// pipeline (per the product decision).
import 'server-only';
import { shell, escapeHtml } from './email-shell';
import { deliver, adminRecipients } from './deliver';
import { SITE } from '@/config/constants';

export interface IContactMessage {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export async function sendContactEmails(
  input: IContactMessage,
): Promise<void> {
  const recipients = await adminRecipients();

  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');

  if (recipients.length > 0) {
    const html = shell(`
      <h2 style="margin:0 0 16px;font-size:18px;">New enquiry from the website</h2>
      <p style="margin:0 0 4px;"><strong>${escapeHtml(input.name)}</strong> &lt;${escapeHtml(input.email)}&gt;</p>
      ${input.phone ? `<p style="margin:0 0 4px;">Phone: ${escapeHtml(input.phone)}</p>` : ''}
      ${input.subject ? `<p style="margin:0 0 4px;">Subject: ${escapeHtml(input.subject)}</p>` : ''}
      <div style="margin:16px 0;padding:16px;background:#F3F1D9;border-radius:8px;font-size:14px;line-height:1.6;">${safeMessage}</div>
      <p style="margin:0;color:#6b7280;font-size:13px;">Reply to this email to answer them directly.</p>
    `);

    await deliver({
      to: recipients.join(', '),
      subject: input.subject
        ? `Enquiry: ${input.subject} - ${SITE.name}`
        : `Enquiry from ${input.name} - ${SITE.name}`,
      html,
      replyTo: input.email,
      devConsole: `Contact from ${input.name} <${input.email}>: ${input.message.slice(0, 120)}`,
    });
  }

  // Acknowledgement to the sender.
  const ackHtml = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">We received your message</h2>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 16px;">Thanks for reaching out to ${SITE.name} - your message is with our team and we'll get back to you shortly.</p>
    <div style="margin:16px 0;padding:16px;background:#F3F1D9;border-radius:8px;font-size:14px;line-height:1.6;">${safeMessage}</div>
  `);

  await deliver({
    to: input.email,
    subject: `We received your message - ${SITE.name}`,
    html: ackHtml,
    devConsole: `Ack sent to ${input.email}`,
  });
}
