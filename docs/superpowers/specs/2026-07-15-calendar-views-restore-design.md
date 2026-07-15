# Calendar Tab — restore Month + Year views — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming) — NOT yet planned/built. Continuation of the Calendar IA consolidation.
**Depends on:** the merged feature at `main` local `a85cdb5` (property page tabs + `PropertyCalendarTab`). See `2026-07-15-calendar-ia-consolidation-design.md`.

## Problem

Retiring the old `AnnualCalendarTab` (deleted in commit `8bc92ea`) removed two views the team used: the **Year** grid (12 mini-months) and the **Month** grid (weeks). The new per-property Calendar tab currently offers only the horizontal **Timeline** (7/14/31d via `MultiCalendarView`). The user wants Month and Year back, inside the same Calendar tab, under a single view switcher.

## Decision (agreed)

A **single 3-way view switcher** in `PropertyCalendarTab`: **Timeline · Month · Year**.

- Default view = **Timeline** (current behaviour).
- **Timeline** → `MultiCalendarView` (unchanged; 7/14/31d, € Preços, iCal↔Beds24 lens).
- **Month** → restored `AnnualCalendarTab` forced to its `monthly` view.
- **Year** → restored `AnnualCalendarTab` forced to its `annual` view.
- The existing **property-switcher dropdown** stays ABOVE the view switcher and applies to all three views.

## What the old `AnnualCalendarTab` was (from git `0c2e5c0`)

Self-contained client component, 826 lines. Recover verbatim with:
`git show 0c2e5c0:components/admin/properties/AnnualCalendarTab.tsx`

- Props: `{ propertyId, activeLang }`.
- Internal state `view: "annual" | "monthly"` (default `"annual"`), with its own Year/Month toggle at ~line 154 (`[["annual","Year",LayoutGrid],["monthly","Month",CalendarDays]]`).
- **Year view**: `grid grid-cols-3 lg:grid-cols-4` of mini-months; clicking a mini-month sets `currentMonth` and switches to `monthly`.
- **Month view**: `grid grid-cols-7` weeks grid.
- Own data fetch: `reservations` (guest reservations), `blocked_dates` (`id,start_date,end_date,source,reason` for the property), and `properties.price_per_night` (single nightly price shown in the grids).

## Changes required

### 1. Restore + adapt `components/admin/properties/AnnualCalendarTab.tsx`

Recover the file from git, then make it externally controllable:

- Add optional props: `view?: "annual" | "monthly"` and `onViewChange?: (v: "annual" | "monthly") => void`.
- **Controlled mode** (when `view` is provided): use the prop instead of internal state, and **hide the component's own Year/Month toggle** (the parent switcher owns it).
- The Year-view "click a mini-month → go to that month" action must still set `currentMonth` AND call `onViewChange("monthly")` so the parent switcher flips to Month.
- Uncontrolled mode (no `view` prop) keeps the old behaviour intact, so the component is safe if reused elsewhere.
- Keep `activeLang` prop; pass the tab's `locale`.

### 2. `components/admin/properties/PropertyCalendarTab.tsx` — add the switcher

- New state `view: "timeline" | "monthly" | "annual"` (default `"timeline"`).
- Render a single premium 3-segment switcher (Timeline · Month · Year) above the calendar area, below the property dropdown. Match existing admin tokens (`admin-border`, `admin-dark-*`, `#171717`/`#a3a3a3`).
- `timeline` → existing `MultiCalendarView` block (unchanged).
- `monthly` → `<AnnualCalendarTab propertyId={propertyId} activeLang={locale} view="monthly" onViewChange={(v) => setView(v)} />`.
- `annual` → `<AnnualCalendarTab propertyId={propertyId} activeLang={locale} view="annual" onViewChange={(v) => setView(v)} />`.
- (`onViewChange("monthly")` from the Year mini-month click maps directly to `setView("monthly")`.)

### 3. i18n — `AdminReservations.propertyTabs`

Add `viewTimeline`, `viewMonth`, `viewYear` in en/pt/he (he mirrors en). Suggested: en `Timeline/Month/Year`, pt `Linha/Mês/Ano` (or `Timeline/Mês/Ano`).

## Non-goals

- Unifying the data source of the two components (`AnnualCalendarTab` keeps its own fetch).
- Bringing the € Preços rail or the iCal↔Beds24 lens into the Month/Year grids (they keep the simple `price_per_night`, as before).

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- i18n key parity en/pt/he for the 3 new keys.
- Manual E2E (super_admin, auth-gated): open a property → Calendar tab → switch Timeline/Month/Year; in Year, click a mini-month → lands on Month for that month; property dropdown still switches property in every view; dark mode.
