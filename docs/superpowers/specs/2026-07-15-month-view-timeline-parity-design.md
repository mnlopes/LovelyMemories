# Month view — Timeline-grade bars + real prices — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming) — NOT yet planned/built.
**Depends on:** the restored Calendar tab at `main` local `304a6a1` (`PropertyCalendarTab` with the Timeline · Month · Year switcher; `AnnualCalendarTab` restored + controllable). See `2026-07-15-calendar-views-restore-design.md`.

## Problem

The restored **Month** view (`AnnualCalendarTab`, monthly view) renders bars in its own older style — rounded-rect segments, hatched Airbnb/Booking/block backgrounds, a `Globe` placeholder for Airbnb — and shows a single flat nightly price (`properties.price_per_night`, e.g. `€180`) under every free day. The **Timeline** (`MultiCalendarView`) looks materially richer: diagonal **parallelogram** bars (clip-path), the **real Airbnb logo** (`react-icons` `FaAirbnb`), a **Beds24** badge, and **real per-night prices + minimum-stay** from Beds24 (`getBeds24DailyPrices`, `Beds24DayInfo`).

The user wants the Month view to use the **same bar UI as the Timeline**, to **keep the Month's existing hover card**, and to show the **Timeline's per-night prices** — done with quality (one source of truth, no visual drift).

## Decisions (agreed)

1. **Full parity** on Month bars: diagonal parallelogram shape, identical status colors, real Airbnb/Beds24 logos.
2. **Prices always visible** in the Month cells (no `€` toggle — the Month cells are wide enough).
3. **Include the minStay moon** (icon + nights) when `minStay > 1`, like the Timeline rail.
4. **Single source of truth (visuals):** extract the Timeline's bar visuals into a shared module; **both** the Timeline and the Month view consume it (the Timeline change is a pure, behavior-preserving refactor).
5. **Beds24 source lens on the property Calendar tab:** replicate the reservations hub's **SOURCE: iCal · Beds24** toggle (super_admin only, local/non-persisting) at the tab level, applying to **all** views (Timeline + Month). When Beds24 is on, for linked properties the iCal blocks a Beds24 booking covers and the `is_airbnb` site reservations are dropped and the rich `beds24_bookings` (name + € + Beds24/Airbnb badge) are injected — identical behaviour to the hub, reusing a shared transform helper.
6. **Unify the data source:** so the toggle affects both views, `PropertyCalendarTab` owns the calendar data (reservations, blocked_dates, nightly price) and the Beds24 lens transform, and passes the result to both views. `AnnualCalendarTab` becomes presentational (data via props; drops its own Supabase fetch). This also removes the previous double-fetch.

## Scope

- **In scope:** the Month view of `AnnualCalendarTab` (bars + prices, now fed by props); a new shared visuals module; a pure refactor of `MultiCalendarView` to consume it; the Beds24 source toggle at `PropertyCalendarTab` level; extracting the hub's Beds24 swap into a shared transform; threading `isSuperAdmin` from the server page; `usePropertyCalendarData` gains `price_per_night` and exposes `refresh`.
- **Out of scope (non-goals):** the **Year** view (mini-months) — unchanged; the Timeline **layout** — unchanged (only its inline visual literals move to the shared module); a `€` toggle in the Month view (prices are always on); persisting the Beds24 lens (stays a local view, like the hub); changing the hub page itself beyond extracting the shared transform it already implements.

## What the two views do today (grounding)

- **Timeline** (`components/admin/reservations/MultiCalendarView.tsx`): absolute-positioned bars along a day-index axis. Bar shape via `getBarClipPath(startsBefore, endsAfter)` (`polygon(...)`); colors via `getStatusColor(status)`; Beds24 rows are solid rose with `FaAirbnb`-in-white-circle (when `res.is_airbnb`) or a `Beds24` text badge; blocked dates are hatched bars (Airbnb rose hatch + rose `FaAirbnb` box, or slate hatch + `Ban`). Prices via a rail band under the bar, per day `€{price}` + `Moon`+`minStay`, only for Beds24-linked properties, gated by a `€ Preços` toggle and only in the 7/14-day windows.
- **Month** (`components/admin/properties/AnnualCalendarTab.tsx`, `view === "monthly"`): a 7-column week grid; a reservation/block is split into per-week `Bar` segments (`row`, `colStart`, `colEnd`, `isStart`, `isEnd`, `stackIndex`, `type: "reservation"|"block"|"airbnb"|"booking"`). Segments render as rounded rects with hatched backgrounds and a `Globe`/`Building2`/`Ban` icon. A flat `pricePerNight` shows under each free day. A `ReservationTooltip` hover card (Reserved/Blocked, check-in/out, nights, ~total) is the hover to KEEP. Its own data fetch pulls `reservations`, `blocked_dates`, and `properties.price_per_night`.
- **Beds24 source lens (hub only, today)** (`app/[locale]/admin/reservations/page.tsx`): a super_admin `SOURCE: iCal · Beds24` toggle. On, `getBeds24CalendarPreview()` returns `{ ok, bookings: [...], internalPropertyIds: [...] }`; the page derives `calendarReservations`/`calendarBlockedDates` by dropping, for linked properties, the `airbnb_booking`/`booking_com` blocks a Beds24 booking overlaps and the `is_airbnb` reservations, then appending `beds24Data.bookings` (which carry `is_beds24`/`is_airbnb`/`beds24_booking_id`/`guest_name`/`total_price`). This transform currently lives inline in the hub page.

## Changes required

### 1. New shared module `components/admin/reservations/calendar-bar-visuals.tsx`

Extract the Timeline's bar-visual primitives verbatim (same values) so both views share one definition:

- `getBarClipPath(startsBefore: boolean, endsAfter: boolean): string` — moved verbatim from `MultiCalendarView` (`polygon(${l}px 0, 100% 0, calc(100% - ${r}px) 100%, 0 100%)`, `l`/`r` = `0` when the bar continues past that edge, else `9`).
- `getReservationStatusColor(status: string): string` — the Tailwind class string from `MultiCalendarView`'s `getStatusColor` (emerald/amber/blue/slate cases + default).
- `effectiveReservationStatus(status: string, checkOut: Date | string): string` — returns `"completed"` when `status === "confirmed"` and `startOfDay(checkOut) <= startOfDay(today)`, else `status`. (Captures the Timeline's inline "completed" downgrade so both views agree.)
- Hatch background constants:
  - `AIRBNB_HATCH = 'repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)'`
  - `BOOKING_HATCH = 'repeating-linear-gradient(45deg, #eff6ff, #eff6ff 6px, #dbeafe 6px, #dbeafe 12px)'`
  - `BLOCK_HATCH = 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)'`
  (These reconcile the two files' near-identical literals to the Timeline's values.)
- `<CalendarBarChannel channel={"airbnb"|"beds24"|"booking"} variant={"solid"|"block"} />` — the channel glyph:
  - `airbnb`: `FaAirbnb` — white-in-rose-circle for `solid` (on a colored bar), or the rose box `FaAirbnb` used on hatched Airbnb blocks for `block`.
  - `booking`: the blue `Building2` box.
  - `beds24`: the `Beds24` text badge.

The module is presentational only (no data, no layout assumptions). `MultiCalendarView`'s own `getBarStyle` (pixel math tied to its day-axis) stays in `MultiCalendarView` — it is layout-specific, not shared.

### 2. `MultiCalendarView.tsx` — consume the shared module (pure refactor)

- Replace the local `getBarClipPath`, `getStatusColor`, the inline `effectiveStatus` computation, the hatch literals, and the inline `FaAirbnb`/`Beds24`/`Ban` badge markup with imports from `calendar-bar-visuals`.
- **No visual change.** Verification: `npm run build` clean and a side-by-side confirmation that the Timeline renders identically (bars, colors, badges, hatches).

### 3. `AnnualCalendarTab.tsx` (monthly view) — data via props + parallelogram bars + real prices

**Data via props (unification):**
- Add props `reservations: any[]`, `blockedDates: any[]`, `pricePerNight: number | null`. Use these instead of the component's own Supabase fetch — **remove** the internal `useEffect`/`supabase` calls that loaded `reservations`, `blocked_dates`, and `properties.price_per_night`. The Month and Year renders read the prop arrays. (`propertyId`, `activeLang`, `view`, `onViewChange` from the restore spec stay.)
- The per-night price fetch below (`getBeds24DailyPrices`) stays inside `AnnualCalendarTab` — it is the Month price rail, independent of the source lens, mirroring how the Timeline owns its own price fetch.

**Bars:**
- Render each week `Bar` segment as the shared parallelogram: apply `clipPath: getBarClipPath(!bar.isStart, !bar.isEnd)` (diagonal only at the true check-in/check-out; straight at week-boundary cuts).
- Reservation segments (`type === "reservation"`): background = `getReservationStatusColor(effectiveReservationStatus(bar.status, bar.checkOut))`.
- Airbnb/Booking/block segments: backgrounds = `AIRBNB_HATCH` / `BOOKING_HATCH` / `BLOCK_HATCH`; glyph via `<CalendarBarChannel>` (`airbnb`→variant `block`, `booking`→booking, `block`→keep `Ban`). This replaces the `Globe` placeholder with the real `FaAirbnb`.
- Keep the segment's existing content layout (initial/name on `showName`, end-price on `bar.isEnd`) and the drop of `border-radius` (the parallelogram replaces the rounded corners). Keep the `pointer-events` layering and the hover handlers.
- **Keep `ReservationTooltip` unchanged** — the hover card stays exactly as-is.

**Prices (always visible):**
- New state: `beds24Prices: Record<string, Beds24DayInfo> | null` and `pricesLoading: boolean`.
- On month change (and mount), call `getBeds24DailyPrices(format(firstOfMonth,"yyyy-MM-dd"), format(firstOfNextMonth,"yyyy-MM-dd"))` (endDate exclusive = first day of next month). On `ok`, set `beds24Prices = r.prices[propertyId] ?? null`; on failure, `beds24Prices = null` (silent — fall back to flat price; no toast, prices are ambient here). Guard against out-of-order responses (cancel flag / month key), mirroring the Timeline's `cancelled` pattern.
- In each valid day cell, under the day number, when the day has **no** guest reservation (existing `!isDateReserved(date)` rule):
  - If `beds24Prices?.[dateKey]?.price` is a number → render `€{price}` (Timeline rail style: `tabular-nums`, muted) and, when `beds24Prices[dateKey].minStay > 1`, the `Moon` + `minStay` indicator.
  - Else (property not Beds24-linked, or that day missing) → fall back to the current flat `pricePerNight` (`€{pricePerNight}` or `-`), preserving today's behaviour so cells are never empty.
- No layout jump while loading: the price line occupies its slot; a missing/loading price simply shows the fallback or nothing extra.

### 4. Shared Beds24 lens transform `lib/beds24-calendar-lens.ts`

Extract the hub's inline swap into a pure, reusable function so the hub and the property tab share one implementation:

```ts
// Applies the Beds24 preview lens to a property's calendar data. Pure; no I/O.
export function applyBeds24Lens(
  reservations: any[],
  blockedDates: any[],
  preview: { bookings: any[]; internalPropertyIds: string[] } | null,
): { reservations: any[]; blockedDates: any[] }
```

- When `preview` is null → return the inputs unchanged.
- `previewPropertyIds = new Set(preview.internalPropertyIds)`.
- `blockedDates` → drop `b` where `['airbnb_booking','booking_com'].includes(b.source)` AND `previewPropertyIds.has(b.property_id)` AND some `preview.bookings` for the same `property_id` overlaps `[b.start_date, b.end_date)` (interval overlap `kStart < bEnd && kEnd > bStart`).
- `reservations` → `[...reservations.filter(r => !(r.is_airbnb && previewPropertyIds.has(r.property_id))), ...preview.bookings]`.
- **Refactor the hub** (`app/[locale]/admin/reservations/page.tsx`) to call `applyBeds24Lens` instead of its inline block — behaviour-preserving. (The `property_name` decoration the hub adds to injected bookings stays in the hub, applied to the returned reservations, since it needs the hub's `propertiesMap`.)

### 5. `usePropertyCalendarData.ts` — add nightly price

- Add `price_per_night` to the `properties` select and expose it (e.g. `pricePerNight: prop.price_per_night ?? null`) in the hook's return, so `PropertyCalendarTab` can pass it to the Month view. (`refresh` is already exposed.)

### 6. `PropertyCalendarTab.tsx` — Beds24 source toggle + own the data

- New prop `isSuperAdmin: boolean` (threaded from the server page; see §7).
- Beds24 lens state (mirrors the hub): `beds24Preview: boolean`, `beds24Data: Extract<Beds24CalendarPreviewResult,{ok:true}> | null`, `beds24Loading: boolean`; `toggleBeds24Preview()` calls `getBeds24CalendarPreview()` (on failure: toast + stay off).
- Render the **SOURCE: iCal · Beds24** segmented toggle (copy the hub's markup) in the tab header, next to the property dropdown / view switcher — **only when `isSuperAdmin`**.
- **Scope the preview to this property first.** `getBeds24CalendarPreview()` returns bookings for *all* linked properties, but the hook's `reservations`/`blockedDates` are single-property and the Month view does not filter by `property_id` — injecting other properties' bookings would leak into the Month grid. So build a scoped preview before applying:
  `const scopedPreview = beds24Preview && beds24Data ? { bookings: beds24Data.bookings.filter(b => b.property_id === propertyId), internalPropertyIds: beds24Data.internalPropertyIds } : null;`
- Compute the effective data once: `const { reservations: calReservations, blockedDates: calBlockedDates } = applyBeds24Lens(reservations, blockedDates, scopedPreview)`.
- Pass `calReservations`/`calBlockedDates` to **both**:
  - `MultiCalendarView` (Timeline) — replaces the raw `reservations`/`blockedDates` props it gets today.
  - `AnnualCalendarTab` (Month/Year) — via the new data props, plus `pricePerNight` from the hook.
- The property dropdown, view switcher, and bounded-height wrapper from the restore spec stay.

### 7. `AnnualCalendarTab.tsx` i18n

- The Month view currently uses no `useTranslations` (hardcoded strings). For the moon tooltip, add a `useTranslations("AdminReservations.multiCalendar")` hook and reuse the existing key `minStayNights` (already present in en/pt; he mirrors en) — no new key needed, no parity change. This is the only i18n touch.

### 8. `PropertyDetailTabs.tsx` + page — thread `isSuperAdmin`

- `PropertyDetailTabs` gains an `isSuperAdmin: boolean` prop and forwards it to `PropertyCalendarTab`.
- `app/[locale]/admin/properties/[id]/page.tsx` resolves the current user's role server-side (query `profiles.role` for the authenticated user, as the admin layer already does elsewhere) and passes `isSuperAdmin={role === 'super_admin'}`. Non-super_admins simply never see the toggle; `getBeds24CalendarPreview` also guards server-side as a backstop.

## Data flow

```
usePropertyCalendarData ─(reservations, blockedDates, pricePerNight, refresh)─> PropertyCalendarTab
getBeds24CalendarPreview() ─(bookings, internalPropertyIds)─> PropertyCalendarTab.beds24Data
PropertyCalendarTab: applyBeds24Lens(reservations, blockedDates, preview) = { calReservations, calBlockedDates }
   ├─ Timeline: <MultiCalendarView reservations=calReservations blockedDates=calBlockedDates ... />
   └─ Month/Year: <AnnualCalendarTab reservations=calReservations blockedDates=calBlockedDates pricePerNight ... />
                     └> getBeds24DailyPrices(month) ──> prices[propertyId]  (Month cells only)
lib/beds24-calendar-lens.ts   ──imported by──> PropertyCalendarTab AND reservations hub page
calendar-bar-visuals.tsx      ──imported by──> MultiCalendarView (Timeline) AND AnnualCalendarTab (Month)
```

## Error handling

- `getBeds24DailyPrices` never throws (best-effort server action). A `!ok` result or a missing property key → `beds24Prices = null` → flat `pricePerNight` fallback. No user-facing error in the Month view (prices are ambient, not an action the user triggered).
- Out-of-order month fetches: discard stale responses via a cancel flag keyed to the requested month.
- `getBeds24CalendarPreview` (the source lens) can fail → toast the error and leave the toggle on iCal (mirror the hub). `applyBeds24Lens(_, _, null)` is the safe identity, so a failed/absent preview always renders the raw iCal data.

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- **Timeline unchanged:** visual confirmation the Timeline renders identically after the refactor (bars, colors, badges, hatches).
- **Hub unchanged:** the reservations hub's Beds24 toggle behaves exactly as before after extracting `applyBeds24Lens` (iCal ↔ Beds24 swaps identical bars).
- **Month parity (super_admin, auth-gated):** open a property → Calendar → **Month**:
  - Reservation bars are diagonal parallelograms with the correct status colors; check-in/check-out edges are diagonal, week-boundary cuts are straight.
  - Airbnb blocks show the real `FaAirbnb` logo (not `Globe`); Booking/other blocks keep their glyphs.
  - Per-night `€` prices appear in the cells for a Beds24-linked property (e.g. Virtudes One), with the moon on `minStay > 1` days; a non-linked property falls back to the flat nightly price.
  - The existing hover card still appears and is unchanged.
  - Dark mode.
- **Beds24 source toggle (super_admin):** the `iCal · Beds24` toggle shows in the property Calendar tab; switching to Beds24 swaps the anonymous iCal Airbnb blocks for rich `beds24_bookings` bars (name + € + Beds24/Airbnb badge, e.g. `Emília Neukranz €806,5`) in **both** Timeline and Month; switching back restores iCal. A non-super_admin never sees the toggle.
- i18n key parity for any new key.

## Non-goals (restated)

- Year view visuals unchanged (it still renders mini-months; it now reads prop data instead of its own fetch, but its look is untouched). Timeline layout unchanged. No `€` prices toggle in the Month view (always on). The Beds24 lens does not persist. The hub page is only refactored to share the transform, not otherwise changed.
