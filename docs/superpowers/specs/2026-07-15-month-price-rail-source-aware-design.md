# Month view — source-aware price rail — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming) — NOT yet planned/built.
**Depends on:** the Month parity + Beds24 lens work at `main` local `18829ea`. See `2026-07-15-month-view-timeline-parity-design.md`.

## Problem

The Month view now shows a per-night price under the day number, but (a) it looks cramped versus the Timeline's clean rail, and (b) it always uses the Beds24 channel price (`getBeds24DailyPrices`), falling back to the flat site base (`price_per_night`, e.g. `€180`). There are really **two** per-night prices, each with its own minimum stay:

- **Channel (Airbnb/Beds24):** `getBeds24DailyPrices` → `price1` + `minStay` (varies by night). What the guest pays on Airbnb. This is what the Timeline rail shows.
- **Site:** `pricing_rules.base_price_per_night` (the `€180`) with per-night overrides in `custom_pricing`, plus the site's own minimum stay `pricing_rules.min_nights`. The site's real nightly price can vary too — it is not just the flat base.

The header `€180/night` badge shows only the flat base, adding to the confusion.

## Decisions (agreed)

1. **Price follows the SOURCE toggle** (the existing iCal · Beds24 switch that already swaps the bar data):
   - **iCal** (default) → show the **site** per-night price (base + `custom_pricing` overrides) with the **site** `min_nights` moon.
   - **Beds24** → show the **channel** per-night price with the **Beds24** `minStay` moon (as the Timeline does).
2. **Visual:** a **bottom-anchored price rail** in each day cell — day number on top; a thin strip at the bottom of each free day with a subtle top divider, **moon + minStay on the left**, **€ price on the right**, `tabular-nums`, muted tones — matching the Timeline rail's look.
3. **Remove** the `€180/night` header badge in the Month view (redundant and misleading next to the real per-night rail).
4. **Single source of truth (price glyph):** the moon+price rendering is a shared component used by both the Timeline rail and the Month rail, so they never drift.

## Scope

- **In scope:** a new `getSiteDailyPrices` server action; a shared `<CalendarDayPrice>` component (Timeline rail refactored to use it — pure); `AnnualCalendarTab` price fetch made source-aware + the bottom-rail visual + header badge removal; `PropertyCalendarTab` passes the price source.
- **Out of scope (non-goals):** the Timeline's layout/behaviour (only its rail-cell inner content moves to the shared component); the Year view (unchanged); the reservations hub (unchanged); the Beds24 lens data transform (unchanged — this is only about the *price* shown, not the bars); any change to how prices are computed for actual bookings (`lib/pricing.ts` stays the source of booking math).

## Changes required

### 1. New server action `getSiteDailyPrices` — `app/actions/pricing.ts` (new file)

```ts
export type DayPriceInfo = { price: number | null; minStay: number | null };
export type SiteDailyPricesResult =
    | { ok: true; prices: Record<string, DayPriceInfo> }
    | { ok: false; error: string };

// Per-night SITE price for a property over [startDate, endDate) (endDate EXCLUSIVE,
// matching getBeds24DailyPrices). price = custom_pricing override for that night if any,
// else pricing_rules.base_price_per_night. minStay = pricing_rules.min_nights (same every day).
// Best-effort; never throws.
export async function getSiteDailyPrices(propertyId: string, startDate: string, endDate: string): Promise<SiteDailyPricesResult>
```

- Reads `pricing_rules` for `property_id` (`base_price_per_night`, `min_nights`) via the server client. If no rules row → `{ ok: true, prices: {} }` (nothing to show; the caller falls back to the flat base prop).
- Reads `custom_pricing` for `property_id` overlapping the window (`start_date < endDate` AND `end_date > startDate`), columns `start_date`, `end_date`, `price_per_night`.
- For each day `d` in `[startDate, endDate)`: `price` = the override whose `[start_date, end_date)` contains `d` (matching `lib/pricing.ts`: `dateStr >= cp.start_date && dateStr < cp.end_date`), else `base_price_per_night`; `minStay` = `min_nights`. Key by `yyyy-MM-dd`.
- Wrap in try/catch → `{ ok: false, error }` on failure.
- **Auth:** unlike `getBeds24DailyPrices` (super_admin only), this must be readable by **any authenticated admin** — the site price rail is the *default* (iCal) view and shows for all admins who can open the property, not just super_admin. Require an authenticated admin role (non-null `getCurrentUserRole()`); do NOT restrict to super_admin. Fail soft (`{ ok: false }`) if unauthenticated.

`DayPriceInfo` is structurally identical to `Beds24DayInfo` (`{ price, minStay }`), so the Month cell treats both sources uniformly.

### 2. Shared price glyph `<CalendarDayPrice>` in `components/admin/reservations/calendar-bar-visuals.tsx`

```tsx
export function CalendarDayPrice({ info, align }: {
    info: { price: number | null; minStay: number | null };
    align: "center" | "between";
}): JSX.Element | null
```

- Renders the **moon + minStay** (only when `info.minStay != null && info.minStay > 1`) and the **€price** (only when `typeof info.price === "number"`), using the Timeline rail's exact classes: moon `Moon size-2.5` + count `text-[8px] font-bold text-[#c4c4c4] dark:text-white/30`; price `font-bold tabular-nums text-[#525252] dark:text-white/70`.
- `align="center"` reproduces the Timeline rail cell (moon absolutely to the left, price centered) — used by the refactored Timeline.
- `align="between"` lays moon (left) and price (right) via `flex items-center justify-between` — used by the Month bottom rail.
- Returns `null` when there is neither a price nor a moon to show.

**Refactor the Timeline** (`MultiCalendarView.tsx`): replace the inline moon/price markup inside its rail cell (the `info?.minStay … Moon … €{info.price}` block) with `<CalendarDayPrice info={info} align="center" />`. Behaviour-preserving — the rail must look identical.

### 3. `AnnualCalendarTab.tsx` — source-aware prices + bottom rail + remove header badge

- **New prop** `priceSource: "site" | "beds24"`.
- **Generalise the price fetch** (the existing `useEffect` that calls `getBeds24DailyPrices`): keep the `view === "monthly"` guard and the `cancelled` pattern; branch on `priceSource`:
  - `"beds24"` → `getBeds24DailyPrices(first, nextFirst)` then `r.prices[propertyId] ?? null` (unchanged).
  - `"site"` → `getSiteDailyPrices(propertyId, first, nextFirst)` then `r.prices ?? null` (already property-scoped).
  Store both under the existing `dayPrices` state (rename `beds24Prices` → `dayPrices`; type `Record<string, DayPriceInfo> | null`). Re-run when `priceSource` changes (add to deps).
- **Bottom rail render:** the day cell becomes `relative` with the day number kept at the top; add a bottom-anchored strip on **valid, non-reserved** days:
  - `absolute inset-x-0 bottom-0` strip, `border-t border-[#f0f0f0] dark:border-white/[0.05]`, `px-1.5 py-0.5`, containing `<CalendarDayPrice info={cellInfo} align="between" />`.
  - `cellInfo` = `dayPrices?.[key] ?? (pricePerNight != null ? { price: pricePerNight, minStay: null } : { price: null, minStay: null })` — the flat `pricePerNight` prop remains the ultimate fallback so cells are never empty (e.g. Beds24 source on an unlinked property).
  - Remove the old inline price span that sat under the day number.
- **Remove** the header `€180/night` badge (the `pricePerNight` chip in the month header).
- Confirm the rail does not visually collide with reservation bars: the rail shows only on non-reserved days, where no bar overlaps that cell; keep it below the bar layer in stacking.

### 4. `PropertyCalendarTab.tsx` — pass the price source

- Pass `priceSource={beds24Preview ? "beds24" : "site"}` to `AnnualCalendarTab` (both monthly and annual mounts; the Year view ignores it).

## Data flow

```
SOURCE toggle (beds24Preview) ─┬─> applyBeds24Lens  → bars (existing)
                               └─> priceSource = beds24Preview ? "beds24" : "site"
AnnualCalendarTab (monthly): priceSource === "beds24" ? getBeds24DailyPrices(month)[propertyId]
                                                       : getSiteDailyPrices(propertyId, month)
   → dayPrices[date] → <CalendarDayPrice align="between"> in the cell bottom rail
                        (fallback: flat pricePerNight prop)
calendar-bar-visuals.CalendarDayPrice ──used by──> Timeline rail (align="center") AND Month rail (align="between")
```

## Error handling

- `getSiteDailyPrices` never throws → `{ ok: false }` or `{ prices: {} }` → the Month falls back to the flat `pricePerNight` prop. No user-facing error (prices are ambient).
- Out-of-order month/source fetches discarded via the existing `cancelled` flag (extend it to cover a `priceSource` change).

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- **Timeline unchanged:** the rail renders identically after using `<CalendarDayPrice align="center">`.
- **Month (super_admin):** property → Calendar → Month:
  - With SOURCE = **iCal**: each free day shows the **site** price (base, or a `custom_pricing` override where one exists) with the **site** `min_nights` moon (when >1), in a clean bottom rail (moon left, € right).
  - With SOURCE = **Beds24** (linked property): the rail switches to the **channel** price + Beds24 `minStay` moon (matches the Timeline numbers for the same nights).
  - The `€180/night` header badge is gone; cells are never empty (flat base fallback when a source has no data).
  - Reserved days show no rail; the hover card and bars are unchanged; dark mode.

## Non-goals (restated)

- Timeline/hub/Year behaviour unchanged. No change to booking price math (`lib/pricing.ts`). The Beds24 lens data transform is untouched — this spec changes only the *price shown per cell*, not which bars appear.
