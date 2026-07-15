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
4. **Single source of truth:** extract the Timeline's bar visuals into a shared module; **both** the Timeline and the Month view consume it (the Timeline change is a pure, behavior-preserving refactor).

## Scope

- **In scope:** the Month view of `AnnualCalendarTab`; a new shared visuals module; a pure refactor of `MultiCalendarView` to consume it.
- **Out of scope (non-goals):** the **Year** view (mini-months) — unchanged; the Timeline **layout** — unchanged (only its inline visual literals move to the shared module); **data-source unification** — the Month view keeps its own Supabase fetch (reservations + blocked_dates); a `€` toggle in the Month view (prices are always on).

## What the two views do today (grounding)

- **Timeline** (`components/admin/reservations/MultiCalendarView.tsx`): absolute-positioned bars along a day-index axis. Bar shape via `getBarClipPath(startsBefore, endsAfter)` (`polygon(...)`); colors via `getStatusColor(status)`; Beds24 rows are solid rose with `FaAirbnb`-in-white-circle (when `res.is_airbnb`) or a `Beds24` text badge; blocked dates are hatched bars (Airbnb rose hatch + rose `FaAirbnb` box, or slate hatch + `Ban`). Prices via a rail band under the bar, per day `€{price}` + `Moon`+`minStay`, only for Beds24-linked properties, gated by a `€ Preços` toggle and only in the 7/14-day windows.
- **Month** (`components/admin/properties/AnnualCalendarTab.tsx`, `view === "monthly"`): a 7-column week grid; a reservation/block is split into per-week `Bar` segments (`row`, `colStart`, `colEnd`, `isStart`, `isEnd`, `stackIndex`, `type: "reservation"|"block"|"airbnb"|"booking"`). Segments render as rounded rects with hatched backgrounds and a `Globe`/`Building2`/`Ban` icon. A flat `pricePerNight` shows under each free day. A `ReservationTooltip` hover card (Reserved/Blocked, check-in/out, nights, ~total) is the hover to KEEP. Its own data fetch pulls `reservations`, `blocked_dates`, and `properties.price_per_night`.

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

### 3. `AnnualCalendarTab.tsx` (monthly view) — parallelogram bars + real prices

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

### 4. i18n

- The Month view (`AnnualCalendarTab`) currently uses no `useTranslations` (hardcoded strings). For the moon tooltip, add a `useTranslations("AdminReservations.multiCalendar")` hook and reuse the existing key `minStayNights` (already present in en/pt; he mirrors en) — no new key needed, no parity change. This is the only i18n touch.

## Data flow

```
usePropertyCalendarData (parent) ──> PropertyCalendarTab ──> AnnualCalendarTab (monthly)
                                                              │  own fetch: reservations, blocked_dates, price_per_night
                                                              └> getBeds24DailyPrices(month) ──> prices[propertyId] (Beds24-linked only)
calendar-bar-visuals.tsx  ──imported by──> MultiCalendarView (Timeline)  AND  AnnualCalendarTab (Month)
```

## Error handling

- `getBeds24DailyPrices` never throws (best-effort server action). A `!ok` result or a missing property key → `beds24Prices = null` → flat `pricePerNight` fallback. No user-facing error in the Month view (prices are ambient, not an action the user triggered).
- Out-of-order month fetches: discard stale responses via a cancel flag keyed to the requested month.

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- **Timeline unchanged:** visual confirmation the Timeline renders identically after the refactor (bars, colors, badges, hatches).
- **Month parity (super_admin, auth-gated):** open a property → Calendar → **Month**:
  - Reservation bars are diagonal parallelograms with the correct status colors; check-in/check-out edges are diagonal, week-boundary cuts are straight.
  - Airbnb blocks show the real `FaAirbnb` logo (not `Globe`); Booking/other blocks keep their glyphs.
  - Per-night `€` prices appear in the cells for a Beds24-linked property (e.g. Virtudes One), with the moon on `minStay > 1` days; a non-linked property falls back to the flat nightly price.
  - The existing hover card still appears and is unchanged.
  - Dark mode.
- i18n key parity for any new key.

## Non-goals (restated)

- Year view unchanged. Timeline layout unchanged. No data-source unification. No `€` toggle in the Month view.
