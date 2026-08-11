// Sends (or, with MAIL_PREVIEW_DIR set, renders) one sample of every
// email the system sends, with realistic data. Route everything to one
// inbox with MAIL_FORCE_TO:
//   MAIL_FORCE_TO=you@example.com npm run email:samples
// Requires the SMTP_* env vars unless MAIL_PREVIEW_DIR is set.
import prisma from '@/lib/prisma';
import {
  sendTwoFactorCodeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendEmailChangeConfirmEmail,
} from '@/lib/mail/auth-emails';
import {
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
  sendCompletePaymentEmail,
  sendPreArrivalEmail,
  sendReviewInviteEmail,
  sendBookingNotificationToAdmins,
} from '@/lib/mail/booking-emails';
import { sendContactEmails } from '@/lib/mail/contact-email';

const target = process.argv[2] ?? process.env.MAIL_FORCE_TO;
if (target) process.env.MAIL_FORCE_TO = target;

const user = {
  id: 'sample',
  fullname: 'Ama Mensah',
  email: 'ama.mensah@example.com',
};

async function main() {
  await sendTwoFactorCodeEmail(user, '482913', 'login');
  await sendTwoFactorCodeEmail(user, '175306', 'setup');
  await sendPasswordResetEmail(
    user,
    'https://aestheticssuites.com/reset-password?token=8f3a1c9e2b7d4f6a8c1e3b5d7f9a2c4e',
  );
  await sendPasswordChangedEmail(user);
  await sendEmailChangeConfirmEmail(
    user,
    'https://aestheticssuites.com/confirm-email?token=2b7d4f6a8c1e3b5d7f9a2c4e8f3a1c9e',
    'ama.new@example.com',
  );

  // Real seeded booking so amounts/dates/codes are authentic.
  const booking = await prisma.booking.findFirst({
    where: { code: 'ASB-DEMO-1002' },
    include: { roomType: { select: { name: true, slug: true } } },
  });
  if (booking) {
    const { roomType, ...b } = booking;
    await sendBookingConfirmedEmail(b, roomType.name);
    await sendBookingCancelledEmail(b, roomType.name, b.totalAmount);
    await sendPreArrivalEmail(b, roomType.name);
    await sendReviewInviteEmail(b, roomType.name, roomType.slug);
    await sendBookingNotificationToAdmins(b, roomType.name);
    await sendCompletePaymentEmail(
      { ...b, holdExpiresAt: new Date(Date.now() + 20 * 60 * 1000) },
      roomType.name,
    );
  } else {
    console.warn('Seed booking ASB-DEMO-1002 not found - run the seed.');
  }

  await sendContactEmails({
    name: 'Kwame Boateng',
    email: 'kwame.boateng@example.com',
    phone: '+233241234567',
    subject: 'Airport pickup for a September stay',
    message:
      'Hello,\n\nWe arrive on 10 September around 9pm and would love an airport pickup for two guests. Is that something you arrange, and what would it cost?\n\nThank you,\nKwame',
  });

  console.log(
    process.env.MAIL_PREVIEW_DIR
      ? 'Email samples rendered.'
      : `Email samples sent${target ? ` to ${target}` : ''}.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
