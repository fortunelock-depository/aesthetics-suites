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
| API envelope + error mapping | `src/utils/api-response.ts`, `src/lib/errors.ts` |
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
  `successResponse` / `handleApiError` (lists add
  `pagination: { page, limit, totalItems, totalPages }`, errors are
  `{ status: 'error', message, code? }`); throw the typed errors from
  `src/lib/errors.ts`. This envelope is THIS repo's contract - it predates
  the `{ message, data, meta }` dialect used by the split-repo apps and is
  kept deliberately (one colocated repo, zero drift risk).
- **Zod schemas** live in `src/validations/`; response types in `src/types/`.
- **Per-page SEO** via `pageMetadata()` and a colocated `opengraph-image.tsx`
  that calls `brandOgImage()`.
- Files are kebab-case; imports use the `@/` alias.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run lint`
- `npm run migrate` / `migrate:deploy` / `seed` / `generate`
- `npm test` / `test:watch`


## Deployment

Target: Vercel (serverless) + Neon Postgres. The pieces that are NOT code:

1. **Database**: set `DATABASE_URL` to the POOLED endpoint (Neon pooler /
   pgbouncer) - every serverless instance opens its own pg pool, and direct
   connections exhaust Postgres under load. Keep the DIRECT URL as the
   GitHub Actions secret `PROD_DATABASE_URL` for migrations.
2. **Migrations run before code**: the CI `migrate` job runs
   `prisma migrate deploy` against the direct URL on every push to main,
   BEFORE Vercel builds - new code never runs against an old schema.
3. **Airbnb calendar freshness is demand-driven, not scheduled.** The room
   somebody is looking at gets its calendar pulled right then: on booking
   submit if it is over 5 minutes old (synchronous, 10s cap, before the unit
   is seated), and after an availability check if it is over 15 minutes old
   (in the background, so nobody waits). `icalLastSyncedAt` doubles as the
   claim, so simultaneous visitors fetch once. This matters because a
   schedule can only ever be as fresh as its interval - a 15-minute cron
   still leaves a 15-minute window to sell a room Airbnb just booked,
   whereas syncing at the decision point closes it to seconds. A failed
   fetch never blocks a booking; the existing blocks plus the locked
   availability re-check still protect correctness.
4. **Scheduled housekeeping** (`/api/cron/housekeeping`) is the batch safety
   net: expiring lapsed holds, syncing units nobody browsed, and sending due
   lifecycle emails. Two things call it, both sending
   `Authorization: Bearer <CRON_SECRET>`:
   - **External pinger (primary)**: point cron-job.org at
     `https://<domain>/api/cron/housekeeping`, method GET (POST also works),
     with a custom header `Authorization: Bearer <CRON_SECRET>`. **Use an
     hourly interval.** The response is a JSON summary of what the run did,
     visible in cron-job.org's execution log.
   - **Vercel backstop**: `vercel.json` runs the same route daily at 03:00
     UTC (daily is the Hobby plan's cron limit), so the sweeps still happen
     if the external pinger dies or its account lapses.

   **Why hourly and not every 15 minutes - this is a billing decision.**
   Neon autosuspends the compute when idle and wakes it for the full suspend
   window (~5 minutes) on *any* query. Cost therefore tracks how often
   something pings the database, not how much work each ping does. Hourly
   costs roughly 2 compute-hours a day in the worst case; every 15 minutes
   costs around 8, for sweeps that are not time-critical now that calendar
   freshness rides on demand. If your Neon plan allows it, lowering the
   scale-to-zero delay cuts this further. Nothing here needs a tighter
   interval - if you ever want one, it is a one-line change in the pinger.

   Without `CRON_SECRET` the route fails closed (and logs fatally at boot):
   no hold expiry, no batch Airbnb sync, no lifecycle emails.

   Concurrency is handled by a Postgres advisory lock held for the run, so a
   double-fire from the pinger or a Vercel tick landing on a live run
   returns `{ skipped: true }` instead of duplicating work. It is
   transaction-scoped, so a crash or timeout releases it automatically.

   `maxDuration` is pinned to 60 because Vercel **fails the deployment**
   when a function exceeds the plan maximum, and Hobby's is 60. Pro can
   raise it to 300. A cut-short sweep resumes next run; a failed deploy
   ships nothing.
5. **Paystack**: set the dashboard webhook URL to
   `https://<domain>/api/payments/paystack/webhook` and configure
   `PAYSTACK_SECRET_KEY` (+ optional `PAYSTACK_CALLBACK_URL`).
6. **Required in production**: `NEXT_PUBLIC_BASE_URL` (build fails without
   it), `SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`/`_TOKEN` (rate limiting
   fails closed without them), `CRON_SECRET`, SMTP credentials, Cloudinary
   keys, Turnstile keys.
7. **Observability**: logs are structured JSON (pino). There is no error
   tracker wired; point a Vercel log drain at the project (or add Sentry)
   so `level >= error` pages someone - payment incidents land there.
