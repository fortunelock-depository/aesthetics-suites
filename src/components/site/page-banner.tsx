// src/components/site/page-banner.tsx
import Link from 'next/link';
import { PhotoFrame } from './photo-frame';
import { routes } from '@/lib/routes';

export interface BreadcrumbEntry {
  label: string;
  href: string;
}

/**
 * The inner-page breadcrumb banner: room photography under an ink wash,
 * with a centered white display title and the trail
 * "Home - [ancestors] - {page}" (current page in clay). Detail pages pass
 * their list page via `trail`, so the crumb reads
 * Home - Rooms & Suites - {room}.
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
      {/* An even wash light enough to keep the photograph, plus a deeper
          gradient from the base where the title and trail sit. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-scrim/40" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-linear-to-t from-scrim/60 to-transparent"
      />

      <div className="mx-auto flex min-h-[280px] w-full max-w-[1320px] flex-col items-center justify-center px-4 py-16 text-center lg:min-h-[330px] lg:px-3">
        <h1 className="font-heading text-[38px] leading-[1.15] font-light tracking-[-0.01em] text-white [overflow-wrap:anywhere] lg:text-[58px]">
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
