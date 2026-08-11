// src/app/terms-of-service/page.tsx
import { LegalPage } from '@/components/site/legal-page';
import { SITE, CONTACT } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';
import { routes } from '@/lib/routes';

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description: `The terms that apply when you browse ${SITE.name} or book a stay with us - bookings, payments, cancellations, and guest conduct.`,
  path: routes.terms,
});

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="11 August 2026"
      intro={`These terms apply when you use the ${SITE.name} website or book a stay with us. Placing a booking means you accept them.`}
      sections={[
        {
          heading: 'Bookings and payment',
          body: [
            'A booking is confirmed once payment is completed through our online checkout, or once our front desk confirms a walk-in or phone reservation. The total shown at checkout - nightly rate, any extra-guest charges, discounts, and applicable taxes and levies - is the full price of the stay.',
            'An unpaid online booking holds the room for a short window; if payment is not completed in that time, the hold lapses automatically and the room is released.',
          ],
        },
        {
          heading: 'Cancellations and refunds',
          body: [
            'Each room states its free-cancellation window. Cancel before the window closes and the full amount is refunded to your original payment method; refunds typically arrive within a few business days. Cancellations after the window, and no-shows, are not refunded.',
          ],
        },
        {
          heading: 'Check-in and check-out',
          body: [
            'Bring your booking code and a valid ID at check-in. Check-in and check-out times are communicated in your confirmation email; early check-in and late check-out are subject to availability - ask the front desk.',
          ],
        },
        {
          heading: 'Guest conduct',
          body: [
            'We host you on the understanding that you will treat the suites, staff, and other guests with respect. Smoking is not permitted inside the suites. Damage beyond normal wear may be charged. We may decline or end a stay, without refund, where conduct puts staff or guests at risk.',
          ],
        },
        {
          heading: 'Reviews',
          body: [
            'Reviews you submit may be published on the site after moderation, together with your first name. Submit only your own honest experience; we do not edit reviews beyond removing content that is unlawful or abusive.',
          ],
        },
        {
          heading: 'Liability',
          body: [
            'We take reasonable care of guests and their belongings, but to the extent the law allows, we are not liable for indirect losses, or for valuables left unsecured in the suites. Nothing in these terms limits liability that cannot be limited by law.',
          ],
        },
        {
          heading: 'Changes to these terms',
          body: [
            'We may update these terms from time to time. The version published on this page at the time of your booking is the one that applies to it.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            `Questions about these terms: ${CONTACT.email} or ${CONTACT.phone}, ${SITE.name}, ${CONTACT.location}.`,
          ],
        },
      ]}
    />
  );
}
