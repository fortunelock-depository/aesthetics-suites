// src/lib/og-image.tsx
//
// Shared Open Graph card template used by every opengraph-image.tsx file
// convention. Mirrors the site's visual language: warm charcoal field, dot
// grid, soft bronze glow, monogram badge (logo fallback), and a
// call-to-action pill so shares invite a click.
//
// Satori (behind ImageResponse) supports flexbox + a CSS subset only - no
// grid - so the layout is flex-based, and the ambient glows are positioned
// divs with radial gradients rather than layered backgrounds. OG file
// conventions run on the Node runtime, so the logo (when present in
// public/logo.png) is read from disk and embedded as a data URI.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE, CONTACT } from '@/config/constants';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

// Dark-theme palette from globals.css, as hex for Satori.
const BG = '#1E2118'; // --background (dark olive)
const FG = '#F4F1DC'; // --foreground (dark)
const MUTED = '#B8BCA0'; // --muted-foreground (dark)
const BRAND = '#DCA278'; // --brand (clay)
const BRAND_INK = '#252A1C';
const BORDER = 'rgba(255,255,255,0.14)';

/** The white logo mark as a data URI; null falls back to the monogram. */
async function logoSrc(): Promise<string | null> {
  for (const file of ['logo-mark.png', 'logo.png']) {
    try {
      const logo = await readFile(path.join(process.cwd(), 'public', file));
      return `data:image/png;base64,${logo.toString('base64')}`;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export async function brandOgImage({
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** The conversion line on the card - tailor it per page. */
  cta?: string;
}) {
  // Long titles scale down so they never overflow the card.
  const titleSize = title.length > 60 ? 50 : title.length > 32 ? 60 : 78;
  const host = new URL(SITE.url).host;
  const ctaText = cta ?? 'Visit the suites →';
  const logo = await logoSrc();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 72px',
          background: BG,
          color: FG,
          fontFamily: 'sans-serif',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1.5px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* Ambient brand glows */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -120,
            width: 560,
            height: 560,
            borderRadius: 560,
            background:
              'radial-gradient(circle, rgba(220,162,120,0.26) 0%, rgba(220,162,120,0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            left: -140,
            width: 520,
            height: 520,
            borderRadius: 520,
            background:
              'radial-gradient(circle, rgba(220,162,120,0.16) 0%, rgba(220,162,120,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Header: logo (or monogram) + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={80}
              height={64}
              style={{ width: 80, height: 64, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: 18,
                background: BRAND,
                color: BRAND_INK,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              AS
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{SITE.name}</div>
            <div style={{ fontSize: 20, color: MUTED }}>
              {SITE.tagline}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{ display: 'flex', flexDirection: 'column', maxWidth: 1000 }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 7,
              textTransform: 'uppercase',
              color: BRAND,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 26,
              color: MUTED,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 26,
              background: BRAND,
              color: BRAND_INK,
              borderRadius: 999,
              padding: '14px 30px',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {ctaText}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <span style={{ color: FG }}>{host}</span>
          <span>Suites · Comfort · {CONTACT.location}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
