// src/lib/mail/booking-emails.ts
import 'server-only';
import type { Booking } from '@/lib/prisma';
import { shell, escapeHtml } from './email-shell';
import { deliver, adminRecipients } from './deliver';
import { formatMoney } from '@/lib/format-money';
import { toDateOnlyString } from '@/lib/hotel/dates';
import { SITE } from '@/config/constants';

const detailRows = (booking: Booking, roomTypeName: string): string => {
  const rows: [string, string][] = [
    ['Booking code', booking.code],
    ['Room', roomTypeName],
    ['Check-in', toDateOnlyString(booking.checkIn)],
    ['Check-out', toDateOnlyString(booking.checkOut)],
    ['Nights', String(booking.nights)],
    ['Guests', `${booking.adults} adult(s), ${booking.children} child(ren)`],
    ['Total', formatMoney(booking.totalAmount, booking.currency)],
  ];
  return rows
    .map(
      ([label, value]) => `
      <tr>
        <td class="detail-label" style="padding:6px 12px 6px 0;color:#8B8E74;font-size:13px;white-space:nowrap;">${label}</td>
        <td class="detail-value" style="padding:6px 0;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');
};

/** Guest confirmation, sent once when the booking is paid/confirmed. */
export async function sendBookingConfirmedEmail(
  booking: Booking,
  roomTypeName: string,
): Promise<void> {
  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">Your booking is confirmed</h2>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(booking.guestName)},</p>
    <p style="margin:0 0 16px;">Thank you for booking with ${SITE.name}. Here are your stay details - keep the booking code handy at check-in.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">${detailRows(booking, roomTypeName)}</table>
    <p style="margin:0;color:#6b7280;font-size:13px;">Questions? Just reply to this email.</p>
  `);

  await deliver({
    to: booking.guestEmail,
    subject: `Booking confirmed (${booking.code}) - ${SITE.name}`,
    html,
    devConsole: `Booking confirmed: ${booking.code} / ${roomTypeName} / ${toDateOnlyString(booking.checkIn)} -> ${toDateOnlyString(booking.checkOut)}`,
  });
}

/** Guest cancellation notice, with refund status when one was issued. */
export async function sendBookingCancelledEmail(
  booking: Booking,
  roomTypeName: string,
  refundedAmount: number,
): Promise<void> {
  const refundLine =
    refundedAmount > 0
      ? `<p style="margin:0 0 16px;">A refund of <strong>${formatMoney(refundedAmount, booking.currency)}</strong> has been issued to your original payment method. It typically arrives within a few business days.</p>`
      : `<p style="margin:0 0 16px;">This cancellation falls outside the free-cancellation window, so no refund applies.</p>`;

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">Booking cancelled</h2>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(booking.guestName)},</p>
    <p style="margin:0 0 16px;">Your booking has been cancelled.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">${detailRows(booking, roomTypeName)}</table>
    ${refundLine}
    <p style="margin:0;color:#6b7280;font-size:13px;">We hope to host you another time.</p>
  `);

  await deliver({
    to: booking.guestEmail,
    subject: `Booking cancelled (${booking.code}) - ${SITE.name}`,
    html,
    devConsole: `Booking cancelled: ${booking.code}, refunded ${refundedAmount}`,
  });
}

/** Pre-arrival reminder, sent ~2 days before check-in by the cron. */
export async function sendPreArrivalEmail(
  booking: Booking,
  roomTypeName: string,
): Promise<void> {
  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">We're ready for you</h2>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(booking.guestName)},</p>
    <p style="margin:0 0 16px;">Your stay at ${SITE.name} is coming up - here's a quick reminder of the details. Show the booking code at check-in.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">${detailRows(booking, roomTypeName)}</table>
    <p style="margin:0;color:#6b7280;font-size:13px;">Need to change anything? Reply to this email.</p>
  `);

  await deliver({
    to: booking.guestEmail,
    subject: `Your stay is coming up (${booking.code}) - ${SITE.name}`,
    html,
    devConsole: `Pre-arrival reminder: ${booking.code}`,
  });
}

/** Post-checkout review invitation with the verified-stay link prefilled. */
export async function sendReviewInviteEmail(
  booking: Booking,
  roomTypeName: string,
  roomTypeSlug: string,
): Promise<void> {
  const reviewUrl = `${SITE.url}/rooms/${roomTypeSlug}?review=1&code=${booking.code}`;

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">How was your stay?</h2>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(booking.guestName)},</p>
    <p style="margin:0 0 16px;">Thanks for staying in the ${escapeHtml(roomTypeName)} at ${SITE.name}. A short review helps other guests - and helps us improve.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${reviewUrl}" style="display:inline-block;background-color:#252A1C;color:#fff;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none;">Leave a review</a>
    </div>
    <p style="margin:0;color:#6b7280;font-size:13px;">Your booking code marks the review as a verified stay.</p>
  `);

  await deliver({
    to: booking.guestEmail,
    subject: `How was your stay? - ${SITE.name}`,
    html,
    devConsole: `Review invite: ${booking.code} -> ${reviewUrl}`,
  });
}

/** Staff heads-up for each new confirmed booking. */
export async function sendBookingNotificationToAdmins(
  booking: Booking,
  roomTypeName: string,
): Promise<void> {
  const recipients = await adminRecipients();
  if (recipients.length === 0) return;

  const html = shell(`
    <h2 style="margin:0 0 16px;font-size:18px;">New booking</h2>
    <p style="margin:0 0 16px;">${escapeHtml(booking.guestName)} (${escapeHtml(booking.guestEmail)}) just booked:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">${detailRows(booking, roomTypeName)}</table>
  `);

  await deliver({
    to: recipients.join(', '),
    subject: `New booking ${booking.code} - ${roomTypeName}`,
    html,
    replyTo: booking.guestEmail,
    devConsole: `New booking ${booking.code} by ${booking.guestEmail}`,
  });
}
