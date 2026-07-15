# Calendar IA Consolidation — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming) — ready for implementation plan
**Scope:** Navigation / information architecture of the admin calendars. **Not** the channel-value model (Airbnb vs direct financials) — that is a separate future spec.

## Problem

Calendars are scattered across three surfaces with three different components:

1. **`/admin/reservations`** — the multi-property timeline (`MultiCalendarView`): Calendar/List toggle, 7/14/31-day ranges, iCal↔Beds24 source lens, per-night price rail.
2. **`/admin/properties`** — the properties list; the per-property "View Calendar" action opens a **modal** with a distinct annual grid (`AnnualCalendarTab`). Row click goes to `/admin/properties/[id]` (a plain property editor form).
3. **`/admin/beds24`** — the "Beds24 PMS Lab" (connection state, webhook, import bookings, first-seen-via), with its own per-property calendar link.

Clicking a property does not lead to a coherent per-property home; the annual modal is a different visual language from the operational timeline. The result feels scattered and hard to navigate.

## Goals

- One coherent calendar model reachable from a predictable place, matching best-in-class PMS (Guesty, Hostaway, Lodgify).
- The multi-property timeline stays the portfolio **hub**.
- Clicking a property (from the hub or the properties list) opens a **dedicated property page** whose Calendar tab shows that property's calendar using the **same** calendar component as the hub.
- Retire the divergent `AnnualCalendarTab` modal.
- Fluid property-to-property switching without returning to a list.

## Non-goals

- Channel-value / financial reconciliation model (Airbnb gross/commission/payout vs direct Stripe) — separate spec.
- Changing the Beds24 data model or the iCal↔Beds24 lens behaviour.
- `/admin/beds24` Lab — left untouched this iteration (folded in later).
- A full "Year" per-property view — designed as a possible fast-follow, not built now.

## Reference validation (why this shape)

The three market leaders converge on the same model:

- **Guesty** — Multi-Calendar as the portfolio view in the side nav; the single-listing monthly calendar is reached "through the individual listing page or the multi-calendar."
- **Hostaway** — three calendar types (Monthly per selected listing, Multi-calendar, Yearly); multi-calendar is one consolidated grid across channels with a rates preview.
- **Lodgify** — Multi-Unit and Single calendar switchable top-right; single calendar switches property via a **dropdown**; a **rates toggle** top-right (our "€ Preços").

Our design follows the Guesty/Hostaway "listing page hosts the single calendar" pattern (more scalable), and borrows Lodgify's **property-switcher dropdown** on the single-property calendar for fast switching.

## Target information architecture

```
Sidebar
├── Reservations   →  HUB: multi-property timeline (/admin/reservations, unchanged in function)
│                      • Calendar / List toggle, 7/14/31d, iCal↔Beds24, € Preços rail
│                      • click a BAR → reservation detail sheet (existing)
│                      • click a PROPERTY NAME → that property's page, Calendar tab ▼
│
└── Properties     →  list (/admin/properties, mostly unchanged)
        └── [property] →  DEDICATED PROPERTY PAGE (/admin/properties/[id])
              ├── Overview / Editor   (existing PropertyEditorForm: fields + pricing rules)
              ├── Calendar            (NEW)
              └── Reservations        (NEW)
```

## Components & routes

### Dedicated property page — `/admin/properties/[id]`

Today this route renders `PropertyEditorForm` directly. It becomes a **tabbed page**:

- **Tab: Overview / Editor** — the existing `PropertyEditorForm`, unchanged.
- **Tab: Calendar** — see below.
- **Tab: Reservations** — a filtered list of this property's reservations (reuse the List-view card/table already used by `/admin/reservations`, scoped to this property).

Tab state is deep-linkable via a query param: `/admin/properties/[id]?tab=calendar` (default `overview`). Query param chosen over nested routes to keep the change small and the existing route intact.

### Calendar tab

- Reuses **`MultiCalendarView`** (the exact hub component), passed a single property (its `properties`, `reservations`, `blockedDates`), so it inherits every behaviour for free: same bars, iCal↔Beds24 source lens, € Preços rail + min-stay moon, reservation detail sheet on bar click.
- **Default range = Month (31d)** — matches Guesty/Hostaway single-listing defaults. The 7/14/31d selector remains available.
- **Property-switcher dropdown** at the top of the tab (Lodgify pattern): selecting another property navigates to `/admin/properties/[otherId]?tab=calendar`. Keyed on the properties the admin can see.
- With a single row, the price rail / min-stay band has full vertical room (the "premium row" layout already built for 7/14d applies).

### Navigation wiring

- **Hub property name → link.** In `MultiCalendarView`, the left-rail property name becomes a link to `/admin/properties/[id]?tab=calendar`. Booking bars keep their current click behaviour (reservation / Beds24 detail sheet) — unchanged.
- **Properties list "View Calendar" → route, not modal.** The calendar icon in `/admin/properties` navigates to `/admin/properties/[id]?tab=calendar` instead of opening `AnnualCalendarTab`.
- **Retire `AnnualCalendarTab` modal** from `/admin/properties` (the component may be deleted if unused elsewhere — verify references first).

## Data flow

- The Calendar and Reservations tabs need the same data `/admin/reservations` already loads (`reservations`, `blockedDates`, `properties`), scoped to one property. Reuse the existing server-side fetch/actions, adding a property filter; do not introduce a new data path.
- The iCal↔Beds24 lens (`getBeds24CalendarPreview`) already returns all linked properties; the single-property Calendar tab filters its result to the current property.
- No schema changes. No new migrations.

## Visual quality bar

Execution must reach the Guesty/Hostaway/Lodgify level: clean, modern, pixel-tight, easy to scan, coherent in light and dark mode. The `frontend-design` skill is applied during implementation, screen by screen — tab bar, property-switcher, empty/loading states, density, and micro-interactions. This spec fixes *what* and *where*; the implementation plan and `frontend-design` own *how it looks*.

## Testing / verification

- `npx tsc --noEmit` and `npm run build` clean (project convention; `build` catches the `'use server'` export pitfalls).
- i18n parity across `en/pt/he` for any new UI strings (new tab labels, property-switcher, Reservations tab).
- Manual E2E as super_admin (auth-gated, like the rest of this admin): from the hub, click a property name → lands on its Calendar tab (Month default) with the correct property; € Preços and iCal↔Beds24 behave as in the hub; the property-switcher jumps between properties; "View Calendar" from the list opens the same place; deep-link `?tab=calendar` works; dark mode.

## Future / open

- **Year view** per property (Hostaway-style) as a fast-follow sub-view of the Calendar tab.
- **Channel-value model** (Airbnb vs direct financials) — the second thread, its own spec.
- Eventually fold the **Beds24 Lab** connection tooling into a property-page "Connections" tab.
