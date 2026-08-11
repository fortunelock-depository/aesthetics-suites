import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

// Applied to every route. A full Content-Security-Policy is deliberately
// omitted for now (third-party scripts would need careful allowlisting);
// frame-ancestors covers the clickjacking half of it.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Lets verification builds use their own dist dir so they don't fight a
  // running `next dev` (both default to .next).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Don't advertise the framework in an x-powered-by header.
  poweredByHeader: false,
  // Server-only packages that must not be bundled.
  serverExternalPackages: ['pino'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        // Uploaded images (Cloudinary). Scoped to the image-delivery path
        // shape (`/<cloud>/image/...`) so arbitrary Cloudinary paths aren't
        // allowed.
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/*/image/**',
      },
      {
        // Free placeholder photography (landing sections + demo seed) until
        // the hotel's own Cloudinary shots replace it.
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
