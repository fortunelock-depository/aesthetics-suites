// src/app/contact/page.tsx
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PageBanner } from '@/components/site/page-banner';
import { ContactInfo } from '@/components/contact/contact-info';
import { ContactForm } from '@/components/contact/contact-form';
import { LocationMap } from '@/components/contact/location-map';
import { SITE } from '@/config/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact',
  description: `Reach ${SITE.name} - questions about stays, bookings, or the suites. Call, email, or send a message and we'll get back to you shortly.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageBanner title="Contact" image="/images/contact-bg.webp" />

        {/* How to reach us beside the message form. */}
        <section className="mx-auto grid w-full max-w-[1320px] gap-14 px-4 py-16 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:px-3 lg:py-[120px]">
          <ContactInfo />
          <ContactForm />
        </section>

        <LocationMap />
      </main>
      <SiteFooter />
    </>
  );
}
