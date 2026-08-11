# Aesthetics Suites

Hotel site: public pages where guests browse rooms and book (Paystack or a
link out to Airbnb), plus an authenticated admin console - one fullstack
Next.js 16 (App Router) codebase backed by PostgreSQL via Prisma. Scaffolded
after the `portfolio`, `khadys-kitchen` and `dms` conventions so every shared
concern (auth, security, SEO, errors, data layer, tables, payments) is in
place before the hotel features are.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui primitives (`src/components/ui`)
- Prisma 7 (driver adapter `@prisma/adapter-pg`) + PostgreSQL, soft deletes
- Sessions: jose-signed JWT in an httpOnly cookie, issued by server actions
- RTK Query (single `apiSlice`) for all client-side data
- sonner toasts, next-themes (light/dark), motion for micro-animations
- pino structured logging, Upstash rate limiting (fail-closed in prod)
- Vitest for unit tests

## Getting started

```bash
npm install
cp .env.example .env        # fill DATABASE_URL + SESSION_SECRET
npm run migrate             # create the schema (prisma migrate dev)
ADMIN_SEED_ENABLED=true npm run seed   # create the first admin (see .env.example)
npm run dev
```

Sign in at `/login` with the seeded admin; you land on `/admin`.

## What's scaffolded (and where)

| Concern | Where |
| --- | --- |
| Security headers (HSTS, frame-ancestors, nosniff, ...) | `next.config.ts` |
| Route protection (cheap gate) | `src/proxy.ts` (verified again in `app/admin/layout.tsx`) |
| Sessions (create/verify/require) | `src/lib/session.ts` |
| Auth server actions (signin/logout, rate limited) | `src/lib/auth.ts` |
| API route guards | `src/lib/api-auth.ts` |
| Env validation (fail fast) | `src/config/env.ts` |
| Site identity + SEO defaults | `src/config/constants.ts`, `src/lib/seo.ts` |
| OG image template (all `opengraph-image.tsx` files) | `src/lib/og-image.tsx` |
| robots / sitemap / manifest / icon | `src/app/robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.svg` |
| Error pages (route, root, 404) | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx` |
| API envelope + error mapping | `src/utils/api-response.ts`, `src/middlewares/error-handler.ts` |
| Logging (structured in prod, redacted) | `src/utils/logger.ts` |
| Rate limiting (Upstash / memory / fail-closed) | `src/lib/rate-limit.ts`, `rate-limiter.ts` |
| RTK Query data layer | `src/redux/api-slice.ts` (+ `overview-api.ts` example) |
| Client error normalizer | `src/lib/extract-api-error.ts` |
| Toasts | sonner via `src/components/ui/sonner.tsx`, mounted in `app/layout.tsx` |
| Theme (light/dark/system) | `src/components/theme-provider.tsx`, `theme-toggle.tsx` |
| Loading / error / empty UI states | `src/components/ui/skeleton.tsx`, `error-state.tsx`, `empty-state.tsx` |
| Offline banner | `src/components/ui/offline-banner.tsx` |
| Confirm dialog (destructive actions) | `src/components/ui/confirm-dialog.tsx` |
| Prisma client + soft-delete extension | `src/lib/prisma.ts` |
| Admin seed (env-gated) | `prisma/seed.ts` |
| 2FA (email OTP) + forgot/reset password | `src/lib/auth.ts`, `two-factor-session.ts`, `src/utils/user-security-tokens.ts`, `src/lib/mail/*` |
| Data table (dual render: row cards < md, table >= md) | `src/components/ui/data-table.tsx`, `table-bits.tsx`, `table-empty-logic.ts`, `data-table-pagination.tsx`, `data-table-skeleton.tsx` |
| Filter toolbar (search + panel/bottom-sheet + chips) | `src/components/filters/*` |
| URL-synced table state (+ session memory) | `src/hooks/use-table-query-state.ts`, `table-query-state-logic.ts` |
| Forms layer (react-hook-form + zod) | `src/components/forms/*` |
| Admin chrome (PageHeader, BackLink, StatusBadge, formatters) | `src/components/admin/*`, `src/lib/status-colors.ts`, `format-date.ts`, `format-money.ts` |
| Promise-based confirm | `src/hooks/use-confirm.tsx` |
| Public-page cache helpers (on-demand ISR) | `src/utils/revalidate.ts` |
| Paystack rail (init / verify / webhook, ledger) | `src/lib/paystack/*`, `src/lib/payments/payment-service.ts`, `src/app/api/payments/*`, `/payments/verify` page |
| Cloudinary uploads + client-side downscale | `src/lib/cloudinary.ts`, `uploads.ts`, `optimize-image.ts`, `src/components/admin/file-upload-field.tsx` |
| Reference list page (everything wired) | `/admin/users` - `src/components/admin/users/*`, `src/app/api/users/*`, `src/redux/users-api.ts` |

## Conventions

- **Server Components by default.** `"use client"` only on interactive leaf
  islands (see `overview-client.tsx`).
- **All client data goes through RTK Query.** Add endpoints with
  `apiSlice.injectEndpoints` in a `redux/<feature>-api.ts` file; register new
  cache tags in `src/types/api.ts`.
- **API routes** follow the `{ status, message, data }` envelope from
  `successResponse` / `handleApiError`; throw the typed errors from
  `src/middlewares/error-handler.ts`.
- **Zod schemas** live in `src/validations/`; response types in `src/types/`.
- **Per-page SEO** via `pageMetadata()` and a colocated `opengraph-image.tsx`
  that calls `brandOgImage()`.
- Files are kebab-case; imports use the `@/` alias.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run lint`
- `npm run migrate` / `migrate:deploy` / `seed` / `generate`
- `npm test` / `test:watch`
