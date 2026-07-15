# Month view — source-aware price rail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the property Calendar tab's Month view, show a clean bottom-of-cell price rail whose price + minimum-stay follow the SOURCE toggle — site price (base + `custom_pricing` overrides) under iCal, Beds24 channel price under Beds24 — sharing one price-glyph component with the Timeline.

**Architecture:** A new `getSiteDailyPrices` server action (backed by a pure, unit-tested builder) returns the site per-night price map in the same `{ price, minStay }` shape as `getBeds24DailyPrices`. A shared `<CalendarDayPrice>` component (extracted from the Timeline rail, which is refactored to use it) renders the moon + price identically in both calendars. `AnnualCalendarTab` fetches the map for the active source (via a new `priceSource` prop from `PropertyCalendarTab`) and renders it in a bottom-anchored rail; the redundant `€/night` header badge is removed.

**Tech Stack:** Next.js 16 App Router server actions, React client components, next-intl, date-fns, Supabase (service-role admin client), Tailwind (admin tokens), lucide-react (`Moon`).

## Global Constraints

- No test suite framework; the gate is `npx tsc --noEmit` + `npm run build`. Pure logic added in Task 1 also gets a `scripts/test-*.ts` run via `npx tsx` (repo convention), which must print ALL PASS.
- Task 2 is a behaviour-preserving refactor of the Timeline rail — it must render identically.
- The price shape is `{ price: number | null; minStay: number | null }` in every layer; `getSiteDailyPrices` and `getBeds24DailyPrices` are interchangeable to the Month cell.
- `getSiteDailyPrices` must be readable by **any authenticated admin** (not super_admin only) — the site rail is the default view. Guard: `getCurrentUserRole()` must be non-null.
- Single source of truth: the moon+price glyph lives only in `<CalendarDayPrice>`; both calendars use it.
- i18n: reuse the existing `AdminReservations.multiCalendar.minStayNights` key — no new key.
- Work on the current branch (`main`, local, unpushed). Commit per task. Do NOT push.
- Windows env; Bash tool is Git Bash. `npx tsx`, `git` work.

---

### Task 1: `getSiteDailyPrices` server action + pure builder + test

**Files:**
- Create: `lib/site-daily-prices.ts` (pure builder + type)
- Create: `scripts/test-site-daily-prices.ts` (unit test)
- Create: `app/actions/pricing.ts` (server action)

**Interfaces:**
- Produces:
  - `type DayPriceInfo = { price: number | null; minStay: number | null }`
  - `buildSiteDailyPrices(basePrice: number | null, minNights: number | null, customPrices: { start_date: string; end_date: string; price_per_night: number }[], startDate: string, endDate: string): Record<string, DayPriceInfo>` (endDate EXCLUSIVE)
  - `getSiteDailyPrices(propertyId: string, startDate: string, endDate: string): Promise<{ ok: true; prices: Record<string, DayPriceInfo> } | { ok: false; error: string }>`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-site-daily-prices.ts`:
```ts
import { buildSiteDailyPrices } from "../lib/site-daily-prices";

let failed = 0;
function assert(cond: boolean, msg: string) {
    if (!cond) { console.error("FAIL:", msg); failed++; } else { console.log("ok:", msg); }
}

const custom = [{ start_date: "2026-07-11", end_date: "2026-07-13", price_per_night: 210 }];
// range 10 (incl) .. 13 (excl) => days 10, 11, 12
const out = buildSiteDailyPrices(180, 2, custom, "2026-07-10", "2026-07-13");

assert(Object.keys(out).length === 3, "three days, endDate exclusive");
assert(out["2026-07-10"].price === 180 && out["2026-07-10"].minStay === 2, "day 10 = base price + min_nights");
assert(out["2026-07-11"].price === 210, "day 11 = custom override (start inclusive)");
assert(out["2026-07-12"].price === 210, "day 12 = custom override");
assert(out["2026-07-13"] === undefined, "day 13 excluded (override end_date exclusive AND range end exclusive)");

const noBase = buildSiteDailyPrices(null, 3, [], "2026-07-10", "2026-07-11");
assert(noBase["2026-07-10"].price === null && noBase["2026-07-10"].minStay === 3, "no base -> price null, minStay kept");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx scripts/test-site-daily-prices.ts`
Expected: FAIL — module `../lib/site-daily-prices` does not exist.

- [ ] **Step 3: Implement the pure builder**

Create `lib/site-daily-prices.ts`:
```ts
import { addDays, format } from "date-fns";

export type DayPriceInfo = { price: number | null; minStay: number | null };

/**
 * Per-night SITE price map for [startDate, endDate) (endDate EXCLUSIVE).
 * price = the custom_pricing override whose [start_date, end_date) contains the day,
 * else basePrice. minStay = minNights (constant per property). Pure; no I/O.
 * Override match mirrors lib/pricing.ts: dateStr >= start_date && dateStr < end_date.
 */
export function buildSiteDailyPrices(
    basePrice: number | null,
    minNights: number | null,
    customPrices: { start_date: string; end_date: string; price_per_night: number }[],
    startDate: string,
    endDate: string,
): Record<string, DayPriceInfo> {
    const prices: Record<string, DayPriceInfo> = {};
    let d = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (d < end) {
        const ds = format(d, "yyyy-MM-dd");
        const custom = customPrices.find((cp) => ds >= cp.start_date && ds < cp.end_date);
        const price = custom ? Number(custom.price_per_night) : (basePrice != null ? Number(basePrice) : null);
        prices[ds] = { price, minStay: minNights };
        d = addDays(d, 1);
    }
    return prices;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/test-site-daily-prices.ts`
Expected: `ALL PASS`, exit 0.

- [ ] **Step 5: Implement the server action**

Create `app/actions/pricing.ts`:
```ts
'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUserRole } from '@/app/actions/user';
import { buildSiteDailyPrices, type DayPriceInfo } from '@/lib/site-daily-prices';

export type { DayPriceInfo };

export type SiteDailyPricesResult =
    | { ok: true; prices: Record<string, DayPriceInfo> }
    | { ok: false; error: string };

/**
 * Per-night SITE price for a property over [startDate, endDate) (endDate EXCLUSIVE).
 * Readable by any authenticated admin (the site rail is the default calendar view).
 * Best-effort; never throws.
 */
export async function getSiteDailyPrices(propertyId: string, startDate: string, endDate: string): Promise<SiteDailyPricesResult> {
    try {
        const role = await getCurrentUserRole();
        if (!role) return { ok: false, error: 'Não autorizado' };

        const supabase = await getSupabaseAdmin();
        const { data: rules } = await supabase
            .from('pricing_rules')
            .select('base_price_per_night, min_nights')
            .eq('property_id', propertyId)
            .single();
        if (!rules) return { ok: true, prices: {} };

        const { data: customPrices } = await supabase
            .from('custom_pricing')
            .select('start_date, end_date, price_per_night')
            .eq('property_id', propertyId)
            .lt('start_date', endDate)
            .gt('end_date', startDate);

        const prices = buildSiteDailyPrices(
            rules.base_price_per_night ?? null,
            rules.min_nights ?? null,
            customPrices ?? [],
            startDate,
            endDate,
        );
        return { ok: true, prices };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Site prices failed' };
    }
}
```

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/site-daily-prices.ts scripts/test-site-daily-prices.ts app/actions/pricing.ts
git commit -m "feat(pricing): getSiteDailyPrices — per-night site price map + unit test"
```

---

### Task 2: Shared `<CalendarDayPrice>` + Timeline refactor (pure)

**Files:**
- Modify: `components/admin/reservations/calendar-bar-visuals.tsx`
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Produces: `CalendarDayPrice({ info, align, priceClassName?, minStayTitle? }: { info: { price: number | null; minStay: number | null }; align: "center" | "between"; priceClassName?: string; minStayTitle?: string }): JSX.Element | null`

- [ ] **Step 1: Add `<CalendarDayPrice>` to the shared module**

In `components/admin/reservations/calendar-bar-visuals.tsx`:

Add to the imports at the top:
```tsx
import { Building2, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
```
(Replace the existing `import { Building2 } from "lucide-react";` line with the `Building2, Moon` version; add the `cn` import.)

Append this component to the file:
```tsx
/** Moon (minStay) + € price glyph, shared by the Timeline rail and the Month rail.
 *  align "center": moon absolutely to the left, price centered (Timeline rail cell,
 *  which supplies its own relative/flex-center container).
 *  align "between": moon left, price right in a flex-between row (Month bottom rail). */
export function CalendarDayPrice({
    info, align, priceClassName = "text-[11px]", minStayTitle,
}: {
    info: { price: number | null; minStay: number | null };
    align: "center" | "between";
    priceClassName?: string;
    minStayTitle?: string;
}) {
    const hasMoon = info.minStay != null && info.minStay > 1;
    const hasPrice = typeof info.price === "number";
    if (!hasMoon && !hasPrice) return null;
    return (
        <>
            {hasMoon ? (
                <span
                    title={minStayTitle}
                    className={cn(
                        "flex items-center gap-0.5 text-[8px] font-bold text-[#c4c4c4] dark:text-white/30",
                        align === "center" && "absolute left-1 top-0.5",
                    )}
                >
                    <Moon className="size-2.5" />{info.minStay}
                </span>
            ) : align === "between" ? <span /> : null}
            {hasPrice ? (
                <span className={cn("font-bold tabular-nums text-[#525252] dark:text-white/70", priceClassName)}>
                    €{info.price}
                </span>
            ) : align === "between" ? <span /> : null}
        </>
    );
}
```

- [ ] **Step 2: Refactor the Timeline rail cell to use it**

In `components/admin/reservations/MultiCalendarView.tsx`:

Add `CalendarDayPrice` to the existing import from `@/components/admin/reservations/calendar-bar-visuals`.

Replace the rail-cell inner fragment (the `<> … Moon … €{info.price} … </>` block, currently the non-loading branch that renders the minStay span and price span) with:
```tsx
                                                                <CalendarDayPrice
                                                                    info={info ?? { price: null, minStay: null }}
                                                                    align="center"
                                                                    priceClassName={rangeDays === 7 ? "text-xs" : "text-[11px]"}
                                                                    minStayTitle={info?.minStay != null ? t("minStayNights", { count: info.minStay }) : undefined}
                                                                />
```
(Leave the surrounding `rowLoading ? <skeleton/> : (…)` and the rail cell container `relative flex items-center justify-center` unchanged — the `align="center"` variant relies on that container.)

If `Moon` is now unused in `MultiCalendarView.tsx`, remove it from the lucide import; otherwise leave it.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. (Timeline rail must render identically — verified in E2E.)

- [ ] **Step 4: Commit**

```bash
git add components/admin/reservations/calendar-bar-visuals.tsx components/admin/reservations/MultiCalendarView.tsx
git commit -m "refactor(calendar): shared CalendarDayPrice; Timeline rail consumes it"
```

---

### Task 3: Month source-aware prices + bottom rail; PropertyCalendarTab passes source

**Files:**
- Modify: `components/admin/properties/AnnualCalendarTab.tsx`
- Modify: `components/admin/properties/PropertyCalendarTab.tsx`

**Interfaces:**
- Consumes: `getSiteDailyPrices` (Task 1); `CalendarDayPrice` (Task 2); existing `getBeds24DailyPrices`.
- Produces: `AnnualCalendarTab` props gain `priceSource: "site" | "beds24"`.

- [ ] **Step 1: `AnnualCalendarTab` — imports, prop, source-aware fetch**

In `components/admin/properties/AnnualCalendarTab.tsx`:

Add imports:
```tsx
import { getSiteDailyPrices } from "@/app/actions/pricing";
import { CalendarDayPrice } from "@/components/admin/reservations/calendar-bar-visuals";
```
(Keep the existing `getBeds24DailyPrices`/`Beds24DayInfo` import.)

Add `priceSource` to the interface:
```tsx
    priceSource: "site" | "beds24";
```
Destructure it in the signature (add `priceSource` alongside the other props).

Rename the price state `beds24Prices`/`setBeds24Prices` → `dayPrices`/`setDayPrices` and widen the type:
```tsx
    const [dayPrices, setDayPrices] = useState<Record<string, { price: number | null; minStay: number | null }> | null>(null);
```

Replace the price `useEffect` with the source-aware version:
```tsx
    useEffect(() => {
        if (view !== "monthly") return;
        let cancelled = false;
        const first = new Date(getYear(currentMonth), getMonth(currentMonth), 1);
        const nextFirst = new Date(getYear(currentMonth), getMonth(currentMonth) + 1, 1);
        const start = format(first, "yyyy-MM-dd");
        const end = format(nextFirst, "yyyy-MM-dd");
        const p = priceSource === "beds24"
            ? getBeds24DailyPrices(start, end).then((r) => (r.ok ? (r.prices[propertyId] ?? null) : null))
            : getSiteDailyPrices(propertyId, start, end).then((r) => (r.ok ? r.prices : null));
        p.then((prices) => { if (!cancelled) setDayPrices(prices); }).catch(() => { if (!cancelled) setDayPrices(null); });
        return () => { cancelled = true; };
    }, [currentMonth, propertyId, view, priceSource]);
```

- [ ] **Step 2: `AnnualCalendarTab` — bottom rail render, remove under-number price**

Replace the day-number + inline-price block (the `{valid && (<div className="flex flex-col …"> … day number … price IIFE … </div>)}`, roughly the block containing `{/* Price — show unless day has an actual guest reservation */}`) with the day number only, then add a bottom rail. Specifically:

Replace the price IIFE (the `{date && !isDateReserved(date) && (() => { … })()}` block that renders under the day number) — delete it entirely so the top block contains only the date-number span.

Then, immediately after the `{valid && ( … date number block … )}`, still inside the same `relative` cell `<div>`, add:
```tsx
                                            {valid && date && !isDateReserved(date) && (() => {
                                                const key = format(date, "yyyy-MM-dd");
                                                const info = dayPrices?.[key] ?? (pricePerNight != null ? { price: pricePerNight, minStay: null } : { price: null, minStay: null });
                                                if (typeof info.price !== "number") return null;
                                                return (
                                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-0.5 border-t border-[#f0f0f0] dark:border-white/[0.05] z-[5]">
                                                        <CalendarDayPrice
                                                            info={info}
                                                            align="between"
                                                            priceClassName="text-[10px]"
                                                            minStayTitle={info.minStay != null ? tc("minStayNights", { count: info.minStay }) : undefined}
                                                        />
                                                    </div>
                                                );
                                            })()}
```
(The cell `<div>` is already `relative`. The rail is `bottom-0`; it shows only on valid, non-reserved days with a numeric price. `tc` is the existing `useTranslations("AdminReservations.multiCalendar")` hook.)

If `Moon` is now unused in `AnnualCalendarTab.tsx` (its rendering moved into `CalendarDayPrice`), remove it from the lucide import; otherwise leave it.

- [ ] **Step 3: `AnnualCalendarTab` — remove the `€/night` header badge**

Delete the header price badge block:
```tsx
                        {(pricePerNight || pricePerNight === 0) && (
                            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold text-[#a3a3a3] bg-[#f5f5f5] dark:bg-white/10 px-2 py-1 rounded-lg">
                                {pricePerNight > 0 ? `€${pricePerNight}` : '-'}<span className="font-normal">/night</span>
                            </span>
                        )}
```
(Remove the whole block. `pricePerNight` is still a used prop — it remains the rail fallback — so do NOT remove the prop.)

- [ ] **Step 4: `PropertyCalendarTab` — pass `priceSource`**

In `components/admin/properties/PropertyCalendarTab.tsx`, in the `AnnualCalendarTab` render (the non-timeline branch), add the prop:
```tsx
                    <AnnualCalendarTab
                        propertyId={propertyId}
                        activeLang={locale}
                        view={view}
                        onViewChange={(v) => setView(v)}
                        reservations={calReservations}
                        blockedDates={calBlockedDates}
                        pricePerNight={pricePerNight}
                        priceSource={beds24Preview ? "beds24" : "site"}
                    />
```

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/admin/properties/AnnualCalendarTab.tsx components/admin/properties/PropertyCalendarTab.tsx
git commit -m "feat(properties): Month source-aware price rail (site vs Beds24) + drop header badge"
```

---

## Verification (post-implementation, done by the user)

- `npx tsc --noEmit` + `npm run build` clean (gated per task); `npx tsx scripts/test-site-daily-prices.ts` → ALL PASS.
- **Timeline unchanged:** the rail renders identically after using `<CalendarDayPrice align="center">`.
- **Month (super_admin):** property → Calendar → Month:
  - SOURCE = **iCal**: each free day shows the site price (base, or a `custom_pricing` override where one exists) + `min_nights` moon (when >1), in a clean bottom rail (moon left, € right).
  - SOURCE = **Beds24** (linked property): the rail switches to the Beds24 channel price + Beds24 `minStay` moon (matches the Timeline numbers for the same nights).
  - The `€/night` header badge is gone; reserved days show no rail; cells with a numeric price are never empty (flat base fallback); the hover card and bars are unchanged; dark mode.

## Non-goals

- Timeline/hub/Year behaviour unchanged (Timeline rail only swaps its inner glyph to the shared component). No change to booking price math (`lib/pricing.ts`). The Beds24 lens data transform is untouched — this plan changes only the price shown per cell.
