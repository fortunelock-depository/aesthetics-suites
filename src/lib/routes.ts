// src/lib/routes.ts
//
// Central route map so links are never hand-typed (and never 404 silently
// when a path changes). Add feature routes here as pages land; dynamic
// pages get builder functions.
export const routes = {
  home: '/',
  login: '/login',
  admin: '/admin',
  rooms: '/rooms',
  facilities: '/facilities',
  services: '/services',
  contact: '/contact',
  bookings: '/bookings',
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
} as const;

export const roomDetail = (slug: string) => `/rooms/${slug}` as const;
export const bookRoom = (slug: string) => `/rooms/${slug}/book` as const;
export const facilityDetail = (slug: string) => `/facilities/${slug}` as const;
export const serviceDetail = (slug: string) => `/services/${slug}` as const;
