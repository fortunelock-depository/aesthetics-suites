// src/components/site/legal-page.tsx
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { EYEBROW } from './section-heading';

export interface LegalSection {
  heading: string;
  /** Paragraphs; arrays inside render as bullet lists. */
  body: (string | string[])[];
}

/**
 * Shared shell for the legal documents (privacy policy, terms of service):
 * title + last-updated line, then readable-width sections. Content stays in
 * the page files; this owns the layout so both documents never drift.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  /** e.g. "11 August 2026". */
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-[820px] px-4 py-14 lg:py-20">
          <p className={EYEBROW}>Legal</p>
          <h1 className="mt-3 font-heading text-[34px] leading-[1.15] font-light tracking-[-0.01em] text-foreground lg:text-[48px]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {updated}
          </p>
          <p className="mt-6 text-[15px] leading-[26px] text-foreground/80">
            {intro}
          </p>

          {sections.map((section, index) => (
            <section key={section.heading} className="mt-10">
              <h2 className="font-heading text-[24px] font-normal text-foreground">
                {index + 1}. {section.heading}
              </h2>
              {section.body.map((block, blockIndex) =>
                Array.isArray(block) ? (
                  <ul
                    key={blockIndex}
                    className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-[26px] text-foreground/80"
                  >
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    key={blockIndex}
                    className="mt-3 text-[15px] leading-[26px] text-foreground/80"
                  >
                    {block}
                  </p>
                ),
              )}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
