// src/lib/og-image.tsx
//
// Shared Open Graph card used by every opengraph-image.tsx file convention:
// the ivory field, the logo lockup, the page's line set large in the display
// face, and the property's location along the foot.
//
// Satori (behind ImageResponse) supports flexbox and a CSS subset only, so
// the layout is flex-based. It also cannot read the CSS custom properties in
// globals.css or parse the oklch() they are declared in, so the palette is
// repeated here as the hex each token resolves to.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE, CONTACT } from '@/config/constants';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const IVORY = '#FFF9E2'; // --background
const INK = '#252A1C'; // --foreground
const MUTED_INK = '#6B6F55'; // --muted-foreground
const CLAY_TEXT = '#89552C'; // --brand-text
const HAIRLINE = '#DBDEC2'; // --border

const DISPLAY = 'Cormorant Garamond';
const SANS = 'Jost';

/** The dark logo mark as a data URI; null drops the mark from the lockup. */
async function logoSrc(): Promise<string | null> {
  for (const file of ['logo-mark-dark.png', 'logo.png']) {
    try {
      const logo = await readFile(path.join(process.cwd(), 'public', file));
      return `data:image/png;base64,${logo.toString('base64')}`;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// 'wOF2' as a big-endian uint32. Satori reads ttf, otf and woff; handed a
// woff2 payload it throws on the signature, which would fail the build, so a
// face that arrives compressed is dropped and the card renders in the
// bundled fallback face instead.
const WOFF2_SIGNATURE = 0x774f4632;

async function loadFont(url: URL, name: string) {
  try {
    const data = await fetch(url).then((res) => res.arrayBuffer());
    if (data.byteLength < 4) return null;
    if (new DataView(data).getUint32(0) === WOFF2_SIGNATURE) return null;
    return { name, data, weight: 400 as const, style: 'normal' as const };
  } catch {
    return null;
  }
}

export async function brandOgImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  // Long titles scale down so they never overflow the card.
  const titleSize = title.length > 60 ? 56 : title.length > 32 ? 68 : 84;
  const host = new URL(SITE.url).host;
  const [logo, display, sans] = await Promise.all([
    logoSrc(),
    // TTF rather than the woff2 the browser gets: satori cannot decompress
    // woff2, so the display face ships in both formats.
    loadFont(
      new URL('../app/fonts/cormorant-garamond-400.ttf', import.meta.url),
      DISPLAY,
    ),
    loadFont(new URL('../app/fonts/jost-400.woff2', import.meta.url), SANS),
  ]);
  const fonts = [display, sans].filter((font) => font !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: IVORY,
          color: INK,
          fontFamily: SANS,
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={72}
              height={58}
              style={{ width: 72, height: 58, objectFit: 'contain' }}
            />
          )}
          <div style={{ fontSize: 30, letterSpacing: 1 }}>{SITE.name}</div>
        </div>

        {/* The page's line */}
        <div
          style={{ display: 'flex', flexDirection: 'column', maxWidth: 940 }}
        >
          <div
            style={{
              fontSize: 21,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: CLAY_TEXT,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: DISPLAY,
              fontSize: titleSize,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 26,
              lineHeight: 1.45,
              color: MUTED_INK,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Foot */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 26,
            borderTop: `1px solid ${HAIRLINE}`,
            fontSize: 22,
            color: MUTED_INK,
          }}
        >
          <span style={{ color: INK }}>{host}</span>
          <span>{CONTACT.location}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(fonts.length > 0 && { fonts }) },
  );
}
