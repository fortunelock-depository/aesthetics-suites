// src/app/privacy-policy/page.tsx
import { LegalPage } from '@/components/site/legal-page';
import { SITE, CONTACT } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';
import { routes } from '@/lib/routes';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses, and protects your personal information when you browse our site or book a stay.`,
  path: routes.privacy,
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="11 August 2026"
      intro={`${SITE.name} ("we", "us") respects your privacy. This policy explains what personal information we collect when you use our website or stay with us, why we collect it, and the choices you have.`}
      sections={[
        {
          heading: 'Information we collect',
          body: [
            'We collect only what we need to provide your stay:',
            [
              'Booking details: your name, email address, phone number, party size, stay dates, and any special requests you add.',
              'Payment references: our payment provider gives us a transaction reference, amount, and payment channel. We never see or store your card or mobile-money credentials.',
              'Messages: anything you send through the contact form or by replying to our emails.',
              'Reviews: the name, email, rating, and text you submit with a review.',
            ],
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'We use your information to manage bookings and check-ins, take and refund payments, send booking-related emails (confirmation, pre-arrival reminder, receipts, cancellation notices), answer your messages, and publish reviews you choose to leave after moderation.',
            'We do not sell your information or use it for third-party advertising.',
          ],
        },
        {
          heading: 'Payments',
          body: [
            'Online payments are processed by Paystack, a PCI-DSS-compliant payment provider. Your card or mobile-money details go directly to Paystack over an encrypted connection; we receive only the outcome and a reference. Refunds under our cancellation policy are issued back through the same provider.',
          ],
        },
        {
          heading: 'Service providers',
          body: [
            'We share the minimum necessary information with services that run the site:',
            [
              'Paystack - payment processing and refunds.',
              'Our email provider - transactional email delivery.',
              'Our image and hosting providers - serving the website and its photography.',
            ],
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'The public site works without tracking cookies. A session cookie is set only when staff sign in to the admin console. Your theme preference is stored on your device.',
          ],
        },
        {
          heading: 'Retention',
          body: [
            'Booking and payment records are kept as long as required for accounting and legal purposes. Contact-form messages are not stored in our systems at all - they are delivered straight to our inbox. You may ask us to delete your personal information where the law allows.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You can ask us at any time what information we hold about you, request a correction, or request deletion. Write to us and we will respond promptly.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            `Questions about this policy: ${CONTACT.email} or ${CONTACT.phone}, ${SITE.name}, ${CONTACT.location}.`,
          ],
        },
      ]}
    />
  );
}
