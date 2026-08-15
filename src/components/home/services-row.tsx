// src/components/home/services-row.tsx
import Link from 'next/link';
import { Reveal } from '@/components/site/reveal';
import { amenityIcon } from '@/lib/amenity-icons';
import type { IPublicService } from '@/lib/hotel/public-services';
import { serviceDetail } from '@/lib/routes';

/**
 * The three-up services strip (icon in a soft circle, title, blurb) from
 * the template - data-driven, each title linking to its service detail
 * page. Single column on phones, three across from md.
 */
export function ServicesRow({ services }: { services: IPublicService[] }) {
  return (
    <section
      id="services"
      className="scroll-mt-24 mx-auto w-full max-w-[1320px] px-4 py-16 lg:px-3 lg:py-[120px]"
    >
      <h2 className="sr-only">Guest services</h2>
      <div className="grid gap-10 md:grid-cols-3">
        {services.slice(0, 3).map((service, index) => {
          const Icon = amenityIcon(service.name);
          return (
            <Reveal key={service.id} delay={index * 0.1}>
              <div className="flex items-start gap-5">
                <span className="grid h-[90px] w-[90px] flex-none place-items-center rounded-full bg-muted text-brand">
                  <Icon className="h-8 w-8" strokeWidth={1.25} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[22px] font-medium">
                    <Link
                      href={serviceDetail(service.slug)}
                      className="text-foreground transition-colors hover:text-brand-text [overflow-wrap:anywhere]"
                    >
                      {service.name}
                    </Link>
                  </h3>
                  <p className="mt-2 text-[15px] leading-[26px] text-muted-foreground">
                    {service.summary}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
