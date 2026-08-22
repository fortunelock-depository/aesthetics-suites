// src/components/site/page-banner.tsx
import Link from 'next/link';
import { PhotoFrame } from './photo-frame';
import { routes } from '@/lib/routes';

export interface BreadcrumbEntry {
  label: string;
  href: string;
}

/**
 * The inner-page breadcrumb banner: dark room photography with a centered
 * white display title and the trail "Home - [ancestors] - {page}" (current
 * page in gold). Detail pages pass their list page via `trail` so
 * the crumb reads Home - Room List - {room}.
 */
export function PageBanner({
  title,
  image,
  trail = [],
}: {
  title: string;
  /** Background photo URL. */
  image: string;
  /** Ancestor pages between Home and the current page. */
  trail?: BreadcrumbEntry[];
}) {
  return (
    <section className="relative">
      <PhotoFrame
        src={image}
        alt=""
        className="absolute inset-0 -z-10 h-full"
        sizes="100vw"
        priority
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#0E1317]/70" />

      <div className="mx-auto flex min-h-[280px] w-full max-w-[1320px] flex-col items-center justify-center px-4 py-16 text-center lg:min-h-[330px] lg:px-3">
        <h1 className="font-heading text-[36px] leading-[1.2] font-medium text-white [overflow-wrap:anywhere] lg:text-[55px]">
          {title}
        </h1>
        <nav aria-label="Breadcrumb" className="mt-3">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-[15px] font-medium">
            <li>
              <Link
                href={routes.home}
                className="text-white transition-colors hover:text-brand"
              >
                Home
              </Link>
            </li>
            {trail.map((entry) => (
              <li key={entry.href} className="flex items-center gap-2">
                <span aria-hidden className="text-white/60">
                  -
                </span>
                <Link
                  href={entry.href}
                  className="text-white transition-colors hover:text-brand"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span aria-hidden className="text-white/60">
                -
              </span>
              <span aria-current="page" className="min-w-0 text-brand [overflow-wrap:anywhere]">
                {title}
              </span>
            </li>
          </ol>
        </nav>
      </div>
    </section>
  );
}
