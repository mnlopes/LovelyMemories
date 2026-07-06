# Concierge Page — Fix, CMS Editing & Partner Links

**Date:** 2026-07-06
**Status:** Approved by user

## Goal

Fix the broken layout on the public Concierge page (double scrollbar), make its text and images editable in the admin backoffice (Content Management), and let each service card link out to the external partner company that provides the service. Include approved polish items: richer service cards, a concierge contact CTA, and small layout/contrast fixes.

## Scope decisions (confirmed with user)

- CMS-editable sections: **hero + intro + services header**. The final "Property Owner" section is shared with the homepage and stays out of scope.
- Service cards: **whole card clickable**, opens partner site in a new tab. Cards without a link stay non-clickable.
- Languages in the Concierge page editor: **EN and PT only** — the client does not use Hebrew for now. Public `he` visitors fall back to EN (same as services already do).
- Approved polish: concierge CTA section, richer cards (show description + external-link affordance), services-header breakpoint fix, hero overline contrast fix, hide services section when no active services. The "how it works" strip was offered and not requested — out of scope.

## 1. Layout fixes (public page)

### Double scrollbar
`app/[locale]/(main)/concierge/page.tsx` renders `<main className="relative pt-20 overflow-x-hidden">`. Per CSS spec, `overflow-x: hidden` forces computed `overflow-y: auto`, turning `main` into its own scroll container — any vertical overflow inside produces a second scrollbar next to the window one.

**Fix:** replace `overflow-x-hidden` with `overflow-x-clip` (clips without creating a scroll container).

### Hero height
Hero is `h-screen` inside a page with `pt-20`, so the page is ~80px taller than one viewport and the "Scroll to explore" indicator sits below the fold.

**Fix:** hero becomes `h-[calc(100vh-5rem)]` (keep `min-h-[700px]`).

### Hero overline contrast
`heroOverTitle` pill uses `text-navy-950` on translucent dark background — unreadable over dark photo areas. **Fix:** white/near-white text.

### Services header breakpoint
In `components/ConciergeServices.tsx` the title and the three feature badges go side-by-side at `md:` (768px), squeezing the title to one word per line on tablets. **Fix:** stack until `lg:`.

### Empty state
Public page shows the raw string "No concierge services found." when the table is empty. **Fix:** hide the slider section entirely when there are no active services.

## 2. Concierge page content in Content Management

Reuses the existing `cms_page_sections` table (no schema change) with `page_slug = 'concierge'`, following the About Us pattern (`AboutPageManagement`).

### Data model (rows per locale: en, pt)

| section_type | display_order | fields used |
|---|---|---|
| `hero` | 0 | `title` (big title), `subtitle` (overline), `image_url` (background) |
| `intro` | 1 | `title`, `subtitle` (overline), `content` (paragraph), `image_url`, `list_items` = `[{title, content} x2]` (the two highlight blocks) |
| `services-header` | 2 | `title`, `subtitle` (overline) |

Seed data mirroring current hardcoded i18n is in migration `supabase/migrations/20260706120000_concierge_cms_and_links.sql` (applied manually in the Supabase dashboard; the same migration adds `concierge_services.link_url`).

### Admin UI

- New tab **Concierge** in `app/[locale]/admin/content/page.tsx` (icon: ConciergeBell or similar).
- New component `components/admin/content/ConciergePageManagement.tsx`, modeled on `AboutPageManagement` but simpler (no timeline, no video): language selector **EN/PT only**, per-section forms (hero, intro with its two highlight sub-items, services header), image upload to Supabase Storage (existing bucket pattern), save via `upsertPageSection`.
- `app/actions/cms.ts`: `upsertPageSection` / `deletePageSection` / `reorderPageSections` also revalidate `/[locale]/concierge`.

### Public consumption

- `app/[locale]/(main)/concierge/page.tsx` becomes the data-fetching point: server-side `getPageSections('concierge', locale)` (fallback to `en` rows when the locale has none — covers `he`).
- `ConciergeHero`, `ConciergeIntro`, `ConciergeServices` accept the section content via props. **Fallback:** when a section row is missing or a field is empty, use the current next-intl strings — the site renders identically until an admin edits something.

## 3. Partner links on service cards

- DB: `concierge_services.link_url text` (same migration).
- Admin: "Partner link (URL)" field in `components/admin/concierge/ServiceModal.tsx` — single field, not per-language. Light validation (must start with `http`).
- Public card in `ConciergeServices`:
  - With `link_url`: card wrapped in `<a href target="_blank" rel="noopener noreferrer nofollow">`. Because the slider has drag-to-scroll, the click is suppressed if the pointer moved more than ~5px between down and up (otherwise releasing a drag would open the partner site).
  - Card hover/tap reveals the service **description** (already in DB, currently never shown) and, when a link exists, a subtle "external link" arrow affordance.
  - Without `link_url`: card looks the same minus the link affordance, not clickable.

## 4. Concierge contact CTA (new section)

New section inserted **between the services slider and the PropertyOwner section** (PropertyOwner stays — removing it is a separate decision). Dark elegant band: short line ("Tell us what you need — we take care of the rest" / PT equivalent) + button to `/contact`. Strings come from a fourth CMS section `cta` (`section_type='cta'`, display_order 3, fields `subtitle` = overline, `title` = heading, `content` = paragraph), added to the seed and editable in the same admin tab. The button label is a fixed i18n string; fallback strings for the whole section are added to `messages/{en,pt,he}.json`.

## Error handling

- CMS fetch failure or empty → i18n fallback, page never blank.
- Image upload errors surface as toasts (existing pattern).
- Invalid partner URL rejected in the modal with a toast.

## Testing / verification

No test suite exists. Verification:
1. `npx tsc --noEmit` and `npm run lint`.
2. Preview: single scrollbar on `/en/concierge` and `/pt/concierge`; hero ends at viewport bottom; tablet width (~800px) header no longer squeezed.
3. Admin → Content → Concierge: edit each field + swap an image in EN and PT, confirm public page reflects it after refresh and the other locale is untouched.
4. Admin → Concierge: set a partner link on one service; public card opens it in a new tab; drag-scroll on the slider does not trigger the link; a card without link is not clickable.
5. Empty-state: with all services inactive, slider section hidden (verified by temporary filter, not by mutating data).

## Out of scope

- Hebrew editing UI (public `he` falls back to EN).
- PropertyOwnerSection content editing (shared with homepage).
- "How it works" strip.
- Footer newsletter locale bug (separate issue, noted for later).
