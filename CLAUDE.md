# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lovely Memories (www.lovelymemories.pt — no hyphen; the hyphenated domain does not exist) — vacation-rental booking platform for properties in Porto, Vila Nova de Gaia and the Algarve (plus one in Mykonos). Public booking site + admin backoffice + owner portal. Deployed on Vercel; database/auth on hosted Supabase; payments via Stripe; transactional email via Resend. The `package.json` name is `temp-app` for historical reasons — the real project name is Lovely Memories.

## Commands

```bash
npm run dev                  # dev server (Claude preview config runs it on port 3001)
npm run build                # production build
npm run lint                 # eslint
npx tsc --noEmit             # type-check (no test suite exists; this is the main verification)
npm run test:security        # security smoke tests (scripts/test-security.ts)
```

One-off maintenance/debug scripts live in `scripts/` and are run with `npx tsx scripts/<file>.ts`. They load env via `dotenv.config({ path: '.env.local' })`. `scripts/` is excluded from `tsconfig.json`, so `tsc --noEmit` does not check it.

## Architecture

**Next.js 16 App Router, fully localized.** Every page lives under `app/[locale]/` with next-intl. Locales: `en`, `pt` (`i18n/routing.ts`); `defaultLocale` is `'en'` and must stay `'en'` (SEO decision). Hebrew (`he`) was dropped: `/he/*` redirects to `/en/*` (`next.config.ts`); the backoffice editors still have `he` content tabs, unused by the site. Translations are in `messages/{en,pt}.json` — when adding UI strings, keep both files' keys in parity. Use the `Link`/`redirect`/`useRouter` wrappers exported from `i18n/routing.ts`, not the `next/navigation` ones.

**Route groups under `app/[locale]/`:**
- `(main)` — public site (properties, booking, search, blog, concierge…)
- `(auth)` — login / confirm / set-password flows
- `admin` — staff backoffice (reservations, finances, coupons, CMS content, iCal imports…)
- `owner` — property-owner portal

**Middleware is `proxy.ts`** (Next 16 name for middleware). It chains next-intl routing, Supabase session refresh + role lookup (`profiles.role`), visitor logging to the `visitor_logs` table (via `event.waitUntil`), and a maintenance-mode check (`system_settings` table, cached 60 s per instance; admins bypass). Known perf-sensitive: it runs on every non-asset request, and every Supabase request is a log line on the Free plan. Requests carrying `next-url` (next/link prefetches **and** in-app navigations — Next strips `Next-Router-Prefetch`/`RSC` before the proxy, so they can't be told apart) only run next-intl and a cookie refresh (`getSession`); they skip the role lookup, the maintenance check and the log. So `visitor_logs` counts full page loads only, and excludes bots and localhost. next-intl must keep running for those requests: server components read the locale from the header it sets.

**Backend logic lives in server actions** (`app/actions/*.ts`) — reservations, coupons, iCal sync, CMS, impersonation, etc. API routes (`app/api/`) exist only for things that must be HTTP endpoints: the Stripe webhook (`api/webhooks/stripe`), the iCal cron (`api/cron/sync-ical`, scheduled every minute in `vercel.json`), the public iCal feed export (`api/ical/[propertyId]`), auth callbacks, and contact/newsletter forms.

**Authorization:** role-based (visitor / authenticated / owner / editor / admin / super_admin). Admin segments enforce access server-side via `guardModule`/`guardRoles` from `lib/admin-guard.ts` called in per-segment `layout.tsx` files — these mirror the sidebar visibility logic in `components/admin/AdminSidebar.tsx`; keep both in sync. `super_admin` always passes.

**Supabase clients:** `lib/supabase.ts` exports the browser client and `getSupabaseAdmin()` (service-role, for privileged server-side ops — audit logging, user management). Migrations are timestamped SQL files in `supabase/migrations/` and are applied **manually** in the hosted Supabase dashboard — creating the file does not apply it; say so explicitly when you add one. There are no generated DB types (`supabase/types.ts` is empty).

**iCal sync is two-way:** imports external calendars (Airbnb/Booking) on the cron with a hand-written parser (`parseIcalManual` in `lib/ical-sync.ts`, the server-only engine; `app/actions/ical.ts` only holds the guarded backoffice buttons; `node-ical` was removed because it crashed under Turbopack), writing blocked dates; exports each property's calendar via `ical-generator` at `/api/ical/[propertyId]`. Sync failures must surface in the admin backoffice (admin/imports).

**iCal import links are secrets** (the `?s=`/`?t=` token opens the channel's calendar, reservation codes and guest phone digits included). They live in `property_ical_feeds` — RLS on, no policy and no grant for anon/authenticated, so only the service role reaches it — and are read only through `lib/ical-feeds.ts` (`server-only`). The full URL goes only to the fetcher; the backoffice gets `maskFeedUrl`, logs and errors get `feedLabel` (`lib/ical-feed-url.ts`). Never add them back to `properties`, never log them, never return them to the browser.

**Database exposure check:** after any change to RLS policies, grants or columns, run `npm run check:exposure` (read-only, anon key only). It must report no FAIL. Server actions are public POST endpoints: start each privileged one with `requireRole()` from `lib/auth/require-role.ts`. Once any client component imports a `'use server'` file, **every** export of that file becomes an endpoint, not only the one imported, so service-role helpers that trust their arguments (e.g. `logActivity` in `lib/audit-log.ts`, the iCal engine in `lib/ical-sync.ts`, `finalizeBooking` in `lib/booking-finalize.ts`) belong in `server-only` modules under `lib/`, never in `app/actions/`. To see what is exposed, list `exportedName` in `.next/server/server-reference-manifest.json` after a build.

## Gotchas

- **Legacy/experimental clutter — do not touch or take as reference:** `legacy-archive/`, `temp-app/`, `scratch/`, `concierge/` (root), `app/page-v1.tsx`, and the root-level `add_checkout_i18n*.js` / `tmp_get_*.js` / `replace.js` scripts.
- The `v2`–`v11` homepage iterations under `(main)` (and their `HomeHeroV*` / city-animation components) were **deleted** — they shipped to production as indexable duplicates of the homepage. Recover any hero animation experiment from git history at `77b8c64` if it is ever needed again.
- Host canonicalization (apex → www) is handled by Vercel domain config — never add a www/apex redirect in `next.config.ts` (it creates a redirect loop).
- Security headers are set in `next.config.ts`; a strict CSP is intentionally deferred (needs allow-listing Stripe/GA/Supabase) — don't add one casually.
- `next/image` remote hosts are allow-listed in `next.config.ts` (Supabase storage, unsplash, muscache); new image sources need an entry there.
- Stay dates: every end date is exclusive — `reservations.check_out`, `blocked_dates.end_date` (first free day; the admin block sheet adds 1 to the last picked night) and `locked_dates.check_out`. Parse `YYYY-MM-DD` with `parseDateLocal` (`lib/utils.ts`), never `new Date('2026-12-05')` (UTC midnight: the day before west of Portugal). The booking reference of a Stripe payment comes only from `lib/stripe-reference.ts`.
- Property and building page titles, meta descriptions and photo `alt`s are generated by `lib/property-seo.ts` from the listing data ("The Charming — 1-Bedroom Apartment in Porto"), not taken from the backoffice subtitle. Pass localized objects to it, never `property.title` straight into an `alt` (that rendered `[object Object]` on every card). `lib/seo.ts` emits no `meta keywords` (Google ignores it).
- Homes for sale live in `sale_listings` (RLS on, no policies, no anon/authenticated grants), never in `properties`. The public site reads them only through `lib/sales/repo.ts` (`server-only`, public columns, coordinates rounded to 3 decimals); writes go only through the guarded `app/actions/sales.ts`. `app/api/contact-sale` sends the buyer confirmation only when the rate limiter returns an explicit `true`, and `EMAIL_DRY_RUN=1` makes `sendEmail` log instead of send outside production (ignored when `VERCEL_ENV=production`).
