# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lovely Memories (www.lovelymemories.pt — no hyphen; the hyphenated domain does not exist) — vacation-rental booking platform for properties in Póvoa de Varzim, Portugal. Public booking site + admin backoffice + owner portal. Deployed on Vercel; database/auth on hosted Supabase; payments via Stripe; transactional email via Resend. The `package.json` name is `temp-app` for historical reasons — the real project name is Lovely Memories.

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

**Next.js 16 App Router, fully localized.** Every page lives under `app/[locale]/` with next-intl. Locales: `en`, `pt`, `he` (`i18n/routing.ts`); `defaultLocale` is `'en'` and must stay `'en'` (SEO decision). Translations are in `messages/{en,pt,he}.json` — when adding UI strings, keep the three files' keys in parity. Use the `Link`/`redirect`/`useRouter` wrappers exported from `i18n/routing.ts`, not the `next/navigation` ones.

**Route groups under `app/[locale]/`:**
- `(main)` — public site (properties, booking, search, blog, concierge…)
- `(auth)` — login / confirm / set-password flows
- `admin` — staff backoffice (reservations, finances, coupons, CMS content, iCal imports…)
- `owner` — property-owner portal

**Middleware is `proxy.ts`** (Next 16 name for middleware). It chains next-intl routing, Supabase session refresh + role lookup (`profiles.role`), visitor logging to the `visitor_logs` table (via `event.waitUntil`), and a maintenance-mode check (`system_settings` table; admins bypass). Known perf-sensitive: it runs on every non-asset request.

**Backend logic lives in server actions** (`app/actions/*.ts`) — reservations, coupons, iCal sync, CMS, impersonation, etc. API routes (`app/api/`) exist only for things that must be HTTP endpoints: the Stripe webhook (`api/webhooks/stripe`), the iCal cron (`api/cron/sync-ical`, scheduled every minute in `vercel.json`), the public iCal feed export (`api/ical/[propertyId]`), auth callbacks, and contact/newsletter forms.

**Authorization:** role-based (visitor / authenticated / owner / editor / admin / super_admin). Admin segments enforce access server-side via `guardModule`/`guardRoles` from `lib/admin-guard.ts` called in per-segment `layout.tsx` files — these mirror the sidebar visibility logic in `components/admin/AdminSidebar.tsx`; keep both in sync. `super_admin` always passes.

**Supabase clients:** `lib/supabase.ts` exports the browser client and `getSupabaseAdmin()` (service-role, for privileged server-side ops — audit logging, user management). Migrations are timestamped SQL files in `supabase/migrations/` and are applied **manually** in the hosted Supabase dashboard — creating the file does not apply it; say so explicitly when you add one. There are no generated DB types (`supabase/types.ts` is empty).

**iCal sync is two-way:** imports external calendars (Airbnb/Booking) via `node-ical` on the cron, writing blocked dates; exports each property's calendar via `ical-generator` at `/api/ical/[propertyId]`. Sync failures must surface in the admin backoffice (admin/imports).

## Gotchas

- **Legacy/experimental clutter — do not touch or take as reference:** `legacy-archive/`, `temp-app/`, `scratch/`, `concierge/` (root), `app/page-v1.tsx`, the `v2`–`v11` folders under `(main)` (old homepage iterations), and the root-level `add_checkout_i18n*.js` / `tmp_get_*.js` / `replace.js` scripts.
- Host canonicalization (apex → www) is handled by Vercel domain config — never add a www/apex redirect in `next.config.ts` (it creates a redirect loop).
- Security headers are set in `next.config.ts`; a strict CSP is intentionally deferred (needs allow-listing Stripe/GA/Supabase) — don't add one casually.
- `next/image` remote hosts are allow-listed in `next.config.ts` (Supabase storage, unsplash, muscache); new image sources need an entry there.
