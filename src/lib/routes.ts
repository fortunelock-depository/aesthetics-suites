// src/lib/routes.ts
//
// Central route map so links are never hand-typed (and never 404 silently
// when a path changes). Add feature routes here as pages land.
export const routes = {
  home: '/',
  login: '/login',
  admin: '/admin',
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
} as const;
