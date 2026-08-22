// src/app/layout.tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { StoreProvider } from '@/redux/store-provider';
import { SITE } from '@/config/constants';
import { clampDescription } from '@/lib/seo';
import './globals.css';

// Both faces are self-hosted (latin subset, woff2) rather than fetched from
// Google at build time. `next/font/google` downloads the files during
// `next build`, which makes every deploy depend on a third-party network
// call that can fail for reasons unrelated to the code. These are the same
// files Google would have served.

// Body and interface face. Geometric, so it sits with the logo wordmark, and
// carried at 300-600 because the UI leans on 500 for labels and 600 for
// figures. Every weight the markup asks for is loaded here: a missing weight
// is silently synthesised by the browser at the nearest one it does have.
const jost = localFont({
  src: [
    { path: './fonts/jost-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/jost-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jost-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jost-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

// Display face for headings, the hero and rates. High-contrast old-style
// serif, set light and large: the contrast is what reads as considered at
// display sizes, and it would muddy body copy, so it never runs below ~20px.
const cormorant = localFont({
  src: [
    { path: './fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  // No root-level canonical: Next metadata INHERITS it, which would stamp
  // every detail page as a duplicate of the homepage (deindex risk).
  // pageMetadata()/generateMetadata set per-path canonicals instead.
  // OG/Twitter images come from the opengraph-image.tsx file conventions,
  // generated at build time from src/lib/og-image.tsx.
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: SITE.title,
    description: clampDescription(SITE.description, 125),
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: clampDescription(SITE.description, 125),
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <body>
        <StoreProvider>
          {/*
            The public site ships one look: the brand palette is light, and
            with the marketing pages carrying no theme control a visitor whose
            OS is dark would otherwise be stuck in a theme they cannot leave.
            Staff can still switch the console from its own toggle, and that
            choice persists, so only the automatic OS flip is off.
          */}
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
            >
              Skip to content
            </a>
            <div className="flex min-h-dvh flex-col">{children}</div>
            <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
