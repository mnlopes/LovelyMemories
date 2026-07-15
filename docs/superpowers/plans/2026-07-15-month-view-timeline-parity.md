# Month view — Timeline parity + Beds24 lens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the per-property Calendar tab's Month view render Timeline-grade bars (parallelogram shape, real Airbnb/Beds24 logos) with real Beds24 per-night prices, and add the hub's iCal↔Beds24 source toggle across the whole tab — all sharing one source of truth so the PMS stays visually consistent.

**Architecture:** Extract the Timeline's bar visuals and the hub's Beds24 swap into two shared modules, then refactor the Timeline and the hub to consume them (pure refactors, no behaviour change). Unify the property tab's data source: `PropertyCalendarTab` owns the data + the Beds24 lens and feeds both the Timeline (`MultiCalendarView`) and the Month/Year view (`AnnualCalendarTab`, now presentational). Finally, upgrade the Month bars to the shared visuals and add per-night prices.

**Tech Stack:** Next.js 16 App Router, React client components, next-intl, date-fns, `react-icons` (`FaAirbnb`), lucide-react, Supabase browser client, Tailwind (admin tokens).

## Global Constraints

- No test suite exists; the pass/fail gate is `npx tsc --noEmit` + `npm run build` (per CLAUDE.md). Pure logic added in Task 2 also gets a `scripts/test-*.ts` run via `npx tsx` (repo convention).
- Pure refactors (Tasks 1, 2) must be **behaviour-preserving** — the Timeline and the hub must render identically after them.
- Single source of truth: bar visuals live only in `components/admin/reservations/calendar-bar-visuals.tsx`; the Beds24 swap lives only in `lib/beds24-calendar-lens.ts`. No duplicated literals.
- Beds24 source lens is **super_admin only** and **local/non-persisting** (mirror the hub exactly).
- i18n parity across `messages/{en,pt,he}.json`; reuse the existing `AdminReservations.multiCalendar.minStayNights` key — no new key.
- Work on the current branch (`main`, local, unpushed). Commit per task. Do NOT push.
- Windows env; Bash tool is Git Bash (POSIX). `git show`, `npx tsx` work.

---

### Task 1: Shared bar-visuals module + Timeline refactor (pure)

**Files:**
- Create: `components/admin/reservations/calendar-bar-visuals.tsx`
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Produces:
  - `getBarClipPath(startsBefore: boolean, endsAfter: boolean): string`
  - `getReservationStatusColor(status: string): string`
  - `effectiveReservationStatus(status: string, checkOut: Date | string): string`
  - `AIRBNB_HATCH`, `BOOKING_HATCH`, `BLOCK_HATCH` (string constants)
  - `ChannelBadge({ kind }: { kind: "airbnb-circle" | "beds24" | "airbnb-box" | "booking-box" }): JSX.Element`

- [ ] **Step 1: Create the shared module**

Create `components/admin/reservations/calendar-bar-visuals.tsx` with exactly:
```tsx
import { startOfDay } from "date-fns";
import { Building2 } from "lucide-react";
import { FaAirbnb } from "react-icons/fa";

/** Parallelogram clip-path (Hospitable-style): diagonal ~9px edge at a real
 *  check-in/check-out; straight edge (0px) when the bar continues past that side. */
export function getBarClipPath(startsBefore: boolean, endsAfter: boolean): string {
    const l = startsBefore ? 0 : 9;
    const r = endsAfter ? 0 : 9;
    return `polygon(${l}px 0, 100% 0, calc(100% - ${r}px) 100%, 0 100%)`;
}

/** Tailwind classes for a reservation bar by status. */
export function getReservationStatusColor(status: string): string {
    switch (status) {
        case "confirmed": return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600/20";
        case "pending": return "bg-amber-200 hover:bg-amber-300 text-amber-950 border-amber-300/50";
        case "checked-in": return "bg-blue-500 hover:bg-blue-600 text-white border-blue-600/20";
        case "checked-out":
        case "completed": return "bg-slate-400 hover:bg-slate-500 text-white border-slate-500/20";
        default: return "bg-slate-400 text-white border-slate-500/20";
    }
}

/** A confirmed reservation whose checkout is in the past renders as "completed". */
export function effectiveReservationStatus(status: string, checkOut: Date | string): string {
    if (status !== "confirmed") return status;
    const co = startOfDay(new Date(checkOut)).getTime();
    const today = startOfDay(new Date()).getTime();
    return co <= today ? "completed" : status;
}

export const AIRBNB_HATCH = "repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)";
export const BOOKING_HATCH = "repeating-linear-gradient(45deg, #eff6ff, #eff6ff 6px, #dbeafe 6px, #dbeafe 12px)";
export const BLOCK_HATCH = "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)";

/** Channel glyphs shared by the Timeline and the Month grid. */
export function ChannelBadge({ kind }: { kind: "airbnb-circle" | "beds24" | "airbnb-box" | "booking-box" }) {
    switch (kind) {
        case "airbnb-circle":
            return (
                <span title="Airbnb" className="flex items-center justify-center size-4 rounded-full bg-white shrink-0">
                    <FaAirbnb className="size-2.5 text-rose-500" />
                </span>
            );
        case "beds24":
            return <span className="rounded bg-white/25 px-1 py-px text-[8px] font-bold uppercase tracking-wider leading-none">Beds24</span>;
        case "airbnb-box":
            return (
                <span className="size-5 rounded-md bg-rose-500 flex items-center justify-center shrink-0 shadow-sm">
                    <FaAirbnb className="size-3 text-white" />
                </span>
            );
        case "booking-box":
            return (
                <span className="size-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="size-3 text-white" />
                </span>
            );
    }
}
```

- [ ] **Step 2: Refactor `MultiCalendarView.tsx` to import the shared module**

Add the import (near the existing `getBeds24DailyPrices` import at line ~12):
```tsx
import { getBarClipPath, getReservationStatusColor, effectiveReservationStatus, AIRBNB_HATCH, BLOCK_HATCH, ChannelBadge } from "@/components/admin/reservations/calendar-bar-visuals";
```
Then delete the now-duplicated local definitions:
- Remove the local `getBarClipPath` function (the `polygon(...)` helper, ~lines 225-229).
- Remove the local `getStatusColor` function (~lines 231-240).

Replace the inline "completed" computation in the reservation bar (~lines 491-494):
```tsx
                                            let effectiveStatus = res.status;
                                            if (res.status === 'confirmed' && resCheckOutDate.getTime() <= today.getTime()) {
                                                effectiveStatus = 'completed';
                                            }
```
with:
```tsx
                                            const effectiveStatus = effectiveReservationStatus(res.status, res.check_out);
```
(You may then remove the now-unused `today`/`resCheckOutDate` locals if nothing else uses them; if they are used elsewhere in the block, leave them.)

In the reservation bar `className`, the call `getStatusColor(effectiveStatus)` now resolves to the imported `getReservationStatusColor` — rename the call to `getReservationStatusColor(effectiveStatus)`.

Replace the inline Beds24 badge markup (~lines 515-523):
```tsx
                                            {isBeds24 && (
                                                res.is_airbnb ? (
                                                    <span title="Airbnb" className="flex items-center justify-center size-4 rounded-full bg-white shrink-0">
                                                        <FaAirbnb className="size-2.5 text-rose-500" />
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-white/25 px-1 py-px text-[8px] font-bold uppercase tracking-wider leading-none">Beds24</span>
                                                )
                                            )}
```
with:
```tsx
                                            {isBeds24 && (res.is_airbnb ? <ChannelBadge kind="airbnb-circle" /> : <ChannelBadge kind="beds24" />)}
```

Replace the Airbnb block box markup (~lines 559-561):
```tsx
                                            <div className="size-5 rounded-md bg-rose-500 flex items-center justify-center shrink-0 shadow-sm">
                                                <FaAirbnb className="size-3 text-white" />
                                            </div>
```
with:
```tsx
                                            <ChannelBadge kind="airbnb-box" />
```

Replace the two block-background literals (~lines 552-554):
```tsx
                                        background: isAirbnb
                                            ? 'repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)'
                                            : 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)'
```
with:
```tsx
                                        background: isAirbnb ? AIRBNB_HATCH : BLOCK_HATCH,
```

If `FaAirbnb` is now unused in `MultiCalendarView.tsx`, remove its import; otherwise leave it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS. (The Timeline must render identically — a visual check happens in the final E2E.)

- [ ] **Step 5: Commit**

```bash
git add components/admin/reservations/calendar-bar-visuals.tsx components/admin/reservations/MultiCalendarView.tsx
git commit -m "refactor(calendar): extract shared bar visuals; Timeline consumes them"
```

---

### Task 2: Shared Beds24 lens transform + hub refactor (pure) + test

**Files:**
- Create: `lib/beds24-calendar-lens.ts`
- Create: `scripts/test-beds24-lens.ts`
- Modify: `app/[locale]/admin/reservations/page.tsx`

**Interfaces:**
- Produces:
  - `type Beds24Preview = { bookings: any[]; internalPropertyIds: string[] }`
  - `applyBeds24Lens(reservations: any[], blockedDates: any[], preview: Beds24Preview | null, decorateBooking?: (b: any) => any): { reservations: any[]; blockedDates: any[] }`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-beds24-lens.ts`:
```ts
import { applyBeds24Lens } from "../lib/beds24-calendar-lens";

let failed = 0;
function assert(cond: boolean, msg: string) {
    if (!cond) { console.error("FAIL:", msg); failed++; } else { console.log("ok:", msg); }
}

const reservations = [
    { id: "r1", property_id: "P", is_airbnb: true },   // linked airbnb res -> dropped when preview on
    { id: "r2", property_id: "P", is_airbnb: false },  // direct site res -> kept
    { id: "r3", property_id: "Q", is_airbnb: true },   // other property, not in preview -> kept
];
const blocks = [
    { id: "b1", property_id: "P", source: "airbnb_booking", start_date: "2026-07-05", end_date: "2026-07-09" }, // covered -> dropped
    { id: "b2", property_id: "P", source: "airbnb_booking", start_date: "2026-08-01", end_date: "2026-08-04" }, // NOT covered -> kept
    { id: "b3", property_id: "P", source: "owner",          start_date: "2026-07-05", end_date: "2026-07-09" }, // manual -> kept
];
const preview = {
    internalPropertyIds: ["P"],
    bookings: [{ id: "k1", property_id: "P", check_in: "2026-07-05", check_out: "2026-07-09", is_beds24: true }],
};

// preview null -> identity
const idn = applyBeds24Lens(reservations, blocks, null);
assert(idn.reservations === reservations && idn.blockedDates === blocks, "null preview returns inputs unchanged");

const out = applyBeds24Lens(reservations, blocks, preview);
assert(!out.reservations.some(r => r.id === "r1"), "linked is_airbnb reservation dropped");
assert(out.reservations.some(r => r.id === "r2"), "direct reservation kept");
assert(out.reservations.some(r => r.id === "r3"), "other-property reservation kept");
assert(out.reservations.some(r => r.id === "k1"), "beds24 booking injected");
assert(!out.blockedDates.some(b => b.id === "b1"), "covered airbnb block dropped");
assert(out.blockedDates.some(b => b.id === "b2"), "uncovered airbnb block kept");
assert(out.blockedDates.some(b => b.id === "b3"), "manual block kept");

const dec = applyBeds24Lens(reservations, blocks, preview, (b) => ({ ...b, property_name: "X" }));
assert(dec.reservations.find(r => r.id === "k1")?.property_name === "X", "decorator applied to injected bookings only");
assert(!("property_name" in (dec.reservations.find(r => r.id === "r2") as any)), "decorator not applied to existing reservations");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx scripts/test-beds24-lens.ts`
Expected: FAIL — module `../lib/beds24-calendar-lens` does not exist yet.

- [ ] **Step 3: Implement `lib/beds24-calendar-lens.ts`**

Create `lib/beds24-calendar-lens.ts`:
```ts
export type Beds24Preview = { bookings: any[]; internalPropertyIds: string[] };

/**
 * Applies the Beds24 "source lens" to a property's calendar data. Pure; no I/O.
 * When `preview` is on, for the linked properties it (a) drops the iCal blocks
 * (airbnb_booking / booking_com) that a Beds24 booking overlaps and (b) drops the
 * is_airbnb site reservations, then appends the rich Beds24 bookings. Pre-connection
 * completed stays that only exist as iCal blocks are kept (no coverage → not dropped),
 * avoiding holes in the calendar.
 *
 * `decorateBooking` is applied to each injected booking (the hub uses it to add
 * property_name from its properties map); defaults to identity.
 */
export function applyBeds24Lens(
    reservations: any[],
    blockedDates: any[],
    preview: Beds24Preview | null,
    decorateBooking: (b: any) => any = (b) => b,
): { reservations: any[]; blockedDates: any[] } {
    if (!preview) return { reservations, blockedDates };

    const previewPropertyIds = new Set(preview.internalPropertyIds);

    const beds24CoversBlock = (b: any): boolean => {
        const bStart = new Date(b.start_date).getTime();
        const bEnd = new Date(b.end_date).getTime();
        return preview.bookings.some((bk) => {
            if (bk.property_id !== b.property_id) return false;
            const kStart = new Date(bk.check_in).getTime();
            const kEnd = new Date(bk.check_out).getTime();
            return kStart < bEnd && kEnd > bStart; // interval overlap
        });
    };

    const nextBlocked = blockedDates.filter(
        (b: any) => !(["airbnb_booking", "booking_com"].includes(b.source) && previewPropertyIds.has(b.property_id) && beds24CoversBlock(b)),
    );

    const nextReservations = [
        ...reservations.filter((r: any) => !(r.is_airbnb && previewPropertyIds.has(r.property_id))),
        ...preview.bookings.map(decorateBooking),
    ];

    return { reservations: nextReservations, blockedDates: nextBlocked };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/test-beds24-lens.ts`
Expected: `ALL PASS`, exit 0.

- [ ] **Step 5: Refactor the hub to use the shared transform**

In `app/[locale]/admin/reservations/page.tsx`:

Add the import (with the other imports, near line 10):
```tsx
import { applyBeds24Lens } from "@/lib/beds24-calendar-lens";
```

Replace the inline lens block (the section starting `const previewPropertyIds = beds24Preview && beds24Data ...` through the `calendarReservations` definition, ~lines 471-491) with:
```tsx
    // Beds24 source lens (super_admin). Shared transform — see lib/beds24-calendar-lens.ts.
    const { reservations: calendarReservations, blockedDates: calendarBlockedDates } = applyBeds24Lens(
        reservations,
        blockedDates,
        beds24Preview && beds24Data ? { bookings: beds24Data.bookings, internalPropertyIds: beds24Data.internalPropertyIds } : null,
        (b) => ({ ...b, property_name: propertiesMap[b.property_id]?.title || 'Unknown Property' }),
    );
```
(Keep every other line — the `calendarReservations`/`calendarBlockedDates` names are unchanged, so their downstream uses need no edits.)

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. (Hub behaviour unchanged — verified in E2E.)

- [ ] **Step 7: Commit**

```bash
git add lib/beds24-calendar-lens.ts scripts/test-beds24-lens.ts app/[locale]/admin/reservations/page.tsx
git commit -m "refactor(calendar): extract Beds24 source lens; hub consumes it + unit test"
```

---

### Task 3: Data unification + Beds24 source toggle on the property Calendar tab

**Files:**
- Modify: `components/admin/properties/usePropertyCalendarData.ts`
- Modify: `components/admin/properties/AnnualCalendarTab.tsx` (data via props; bar VISUALS untouched this task)
- Modify: `components/admin/properties/PropertyCalendarTab.tsx`
- Modify: `components/admin/properties/PropertyDetailTabs.tsx`
- Modify: `app/[locale]/admin/properties/[id]/page.tsx`

**Interfaces:**
- Consumes: `applyBeds24Lens` + `Beds24Preview` (Task 2); `getBeds24CalendarPreview`, `Beds24CalendarPreviewResult` from `@/app/actions/beds24`; `getCurrentUserRole` from `@/app/actions/user`.
- Produces:
  - `usePropertyCalendarData(...)` return gains `pricePerNight: number | null`.
  - `AnnualCalendarTab` props gain `reservations: any[]`, `blockedDates: any[]`, `pricePerNight: number | null` (used instead of its own fetch).
  - `PropertyCalendarTab` props gain `isSuperAdmin: boolean`.
  - `PropertyDetailTabs` props gain `isSuperAdmin: boolean`.

- [ ] **Step 1: `usePropertyCalendarData` — fetch + expose `price_per_night`**

In `components/admin/properties/usePropertyCalendarData.ts`:

Add state after the `properties` state (line ~15):
```tsx
    const [pricePerNight, setPricePerNight] = useState<number | null>(null);
```
Add `price_per_night` to the property select (line ~25) — change:
```tsx
            supabase.from("properties").select("id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests, is_multi_unit").eq("id", propertyId).single(),
```
to:
```tsx
            supabase.from("properties").select("id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests, is_multi_unit, price_per_night").eq("id", propertyId).single(),
```
Inside `if (prop) { ... }` (after `setProperties([enhanced]);`), add:
```tsx
            setPricePerNight(typeof prop.price_per_night === "number" ? prop.price_per_night : null);
```
Add `pricePerNight` to the returned object (line ~45):
```tsx
    return { loading, properties, reservations, blockedDates, propertyImages, allProperties, pricePerNight, refresh };
```

- [ ] **Step 2: `AnnualCalendarTab` — take data via props, drop the internal fetch**

In `components/admin/properties/AnnualCalendarTab.tsx`:

Extend the interface (add to `AnnualCalendarTabProps`):
```tsx
    reservations: any[];
    blockedDates: any[];
    pricePerNight: number | null;
```
Change the signature to destructure them and remove the internal data state. Replace:
```tsx
export default function AnnualCalendarTab({ propertyId, activeLang = "en", view: controlledView, onViewChange }: AnnualCalendarTabProps) {
    const [reservations, setReservations] = useState<Res[]>([]);
    const [blockedDates, setBlockedDates] = useState<Res[]>([]);
    const [pricePerNight, setPricePerNight] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
```
with:
```tsx
export default function AnnualCalendarTab({ propertyId, activeLang = "en", view: controlledView, onViewChange, reservations, blockedDates, pricePerNight }: AnnualCalendarTabProps) {
```
Delete the entire data-loading `useEffect` (the block that calls `supabase.from("reservations")…`, `blocked_dates`, and `properties … price_per_night`, sets those states, and toggles `isLoading`). Also remove any remaining references to `isLoading`/`setIsLoading`: the parent now gates loading, so replace the early `if (isLoading) return (<Loader…/>)` guard by deleting it (the component only renders once data is present). If `supabase` / `Loader2` imports become unused, remove them.

(`propertyId` is still used — it stays. Bars, stacking, tooltip, price display remain as-is in THIS task; only the data source changed.)

- [ ] **Step 3: `PropertyCalendarTab` — own data, apply the lens, render the toggle, feed both views**

Replace the entire contents of `components/admin/properties/PropertyCalendarTab.tsx` with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarRange, CalendarDays, LayoutGrid } from "lucide-react";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import AnnualCalendarTab from "@/components/admin/properties/AnnualCalendarTab";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";
import { applyBeds24Lens } from "@/lib/beds24-calendar-lens";
import { getBeds24CalendarPreview, type Beds24CalendarPreviewResult } from "@/app/actions/beds24";

type CalendarTabView = "timeline" | "monthly" | "annual";

export function PropertyCalendarTab({ propertyId, locale, isSuperAdmin }: { propertyId: string; locale: string; isSuperAdmin: boolean }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const tc = useTranslations("AdminReservations");
    const router = useRouter();
    const [view, setView] = useState<CalendarTabView>("timeline");
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, pricePerNight, refresh } =
        usePropertyCalendarData(propertyId, locale);

    // Beds24 source lens (super_admin; local, non-persisting) — mirrors the reservations hub.
    const [beds24Preview, setBeds24Preview] = useState(false);
    const [beds24Data, setBeds24Data] = useState<Extract<Beds24CalendarPreviewResult, { ok: true }> | null>(null);
    const [beds24Loading, setBeds24Loading] = useState(false);
    const toggleBeds24Preview = async () => {
        if (beds24Preview) { setBeds24Preview(false); setBeds24Data(null); return; }
        setBeds24Loading(true);
        try {
            const r = await getBeds24CalendarPreview();
            if (r.ok) { setBeds24Data(r); setBeds24Preview(true); }
            else { toast.error(r.error); }
        } finally { setBeds24Loading(false); }
    };

    // MultiCalendarView expects `properties` as a Map keyed by property id.
    const propertiesMap = properties[0] ? { [properties[0].id]: properties[0] } : {};

    // Scope the preview to THIS property (the hook data is single-property; the Month view
    // does not filter by property, so injecting other properties' bookings would leak in).
    const scopedPreview = beds24Preview && beds24Data
        ? { bookings: beds24Data.bookings.filter((b) => b.property_id === propertyId), internalPropertyIds: beds24Data.internalPropertyIds }
        : null;
    const { reservations: calReservations, blockedDates: calBlockedDates } = applyBeds24Lens(reservations, blockedDates, scopedPreview);

    const segments: [CalendarTabView, string, typeof CalendarRange][] = [
        ["timeline", t("viewTimeline"), CalendarRange],
        ["monthly", t("viewMonth"), CalendarDays],
        ["annual", t("viewYear"), LayoutGrid],
    ];

    return (
        <div className="space-y-4">
            {/* Property dropdown + (super_admin) Beds24 source toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#a3a3a3]">{t("switchProperty")}</label>
                    <select
                        value={propertyId}
                        onChange={(e) => router.push(`/admin/properties/${e.target.value}?tab=calendar`)}
                        className="rounded-lg border border-admin-border dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface px-3 py-1.5 text-sm font-semibold"
                    >
                        {allProperties.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center gap-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg p-1">
                        <span className="pl-2 text-[9px] font-bold uppercase tracking-widest text-[#a3a3a3]">{tc("dataSource")}</span>
                        <button
                            onClick={() => { if (beds24Preview) void toggleBeds24Preview(); }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!beds24Preview ? "bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm" : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"}`}
                        >
                            iCal
                        </button>
                        <button
                            onClick={() => { if (!beds24Preview) void toggleBeds24Preview(); }}
                            disabled={beds24Loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-60 ${beds24Preview ? "bg-rose-500 text-white shadow-sm" : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"}`}
                        >
                            <span className={`size-1.5 rounded-full ${beds24Preview ? "bg-white" : "bg-rose-400"} ${beds24Loading ? "animate-pulse" : ""}`} />
                            Beds24
                        </button>
                    </div>
                )}
            </div>

            {/* Single 3-way view switcher: Timeline · Month · Year */}
            <div className="flex items-center gap-0.5 bg-[#f3f3f3] dark:bg-white/10 p-1 rounded-xl w-fit">
                {segments.map(([v, label, Icon]) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        aria-label={label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200
                            ${view === v
                                ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-white shadow-sm"
                                : "text-[#999] hover:text-[#171717] dark:hover:text-white"
                            }`}
                    >
                        <Icon className="size-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("loading")}</div>
            ) : view === "timeline" ? (
                <MultiCalendarView
                    reservations={calReservations}
                    properties={propertiesMap}
                    propertyImages={propertyImages}
                    blockedDates={calBlockedDates}
                    locale={locale}
                    canShowPrices={true}
                    initialRange={31}
                    onRefresh={refresh}
                />
            ) : (
                // AnnualCalendarTab was built for a modal that bounded its height; give it one here.
                <div className="h-[calc(100vh-20rem)] min-h-[32rem]">
                    <AnnualCalendarTab
                        propertyId={propertyId}
                        activeLang={locale}
                        view={view}
                        onViewChange={(v) => setView(v)}
                        reservations={calReservations}
                        blockedDates={calBlockedDates}
                        pricePerNight={pricePerNight}
                    />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: `PropertyDetailTabs` — thread `isSuperAdmin`**

In `components/admin/properties/PropertyDetailTabs.tsx`, add `isSuperAdmin: boolean` to the props type and forward it. Change the destructure (line ~13):
```tsx
export function PropertyDetailTabs({
    propertyId,
    locale,
    isNew,
    overview,
}: {
    propertyId: string;
    locale: string;
    isNew: boolean;
    overview: React.ReactNode;
}) {
```
to add `isSuperAdmin`:
```tsx
export function PropertyDetailTabs({
    propertyId,
    locale,
    isNew,
    overview,
    isSuperAdmin,
}: {
    propertyId: string;
    locale: string;
    isNew: boolean;
    overview: React.ReactNode;
    isSuperAdmin: boolean;
}) {
```
And pass it down (line ~57):
```tsx
            {active === "calendar" && <PropertyCalendarTab propertyId={propertyId} locale={locale} isSuperAdmin={isSuperAdmin} />}
```

- [ ] **Step 5: Server page — resolve role and pass `isSuperAdmin`**

In `app/[locale]/admin/properties/[id]/page.tsx`:

Add the import (with the other imports at the top):
```tsx
import { getCurrentUserRole } from "@/app/actions/user";
```
Before the `return (` (line ~78), resolve the role:
```tsx
    const role = await getCurrentUserRole();
    const isSuperAdmin = role === "super_admin";
```
Pass it to the component (line ~80):
```tsx
        <PropertyDetailTabs
            propertyId={id}
            locale={locale}
            isNew={isNew}
            isSuperAdmin={isSuperAdmin}
            overview={
```

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. The Month/Year now render from prop data; the Beds24 toggle (super_admin) swaps data for both Timeline and Month.

- [ ] **Step 7: Commit**

```bash
git add components/admin/properties/usePropertyCalendarData.ts components/admin/properties/AnnualCalendarTab.tsx components/admin/properties/PropertyCalendarTab.tsx components/admin/properties/PropertyDetailTabs.tsx "app/[locale]/admin/properties/[id]/page.tsx"
git commit -m "feat(properties): unify Calendar tab data + Beds24 source toggle across views"
```

---

### Task 4: Month view visual parity — parallelogram bars + Beds24 per-night prices

**Files:**
- Modify: `components/admin/properties/AnnualCalendarTab.tsx`

**Interfaces:**
- Consumes: the shared visuals from Task 1 (`getBarClipPath`, `getReservationStatusColor`, `effectiveReservationStatus`, `AIRBNB_HATCH`, `BOOKING_HATCH`, `BLOCK_HATCH`, `ChannelBadge`); `getBeds24DailyPrices`, `Beds24DayInfo` from `@/app/actions/beds24`; prop data from Task 3.

- [ ] **Step 1: Imports (visuals + prices + i18n + Moon)**

In `components/admin/properties/AnnualCalendarTab.tsx`, add:
```tsx
import { getBarClipPath, getReservationStatusColor, effectiveReservationStatus, AIRBNB_HATCH, BOOKING_HATCH, BLOCK_HATCH, ChannelBadge } from "@/components/admin/reservations/calendar-bar-visuals";
import { getBeds24DailyPrices, type Beds24DayInfo } from "@/app/actions/beds24";
import { useTranslations } from "next-intl";
```
Ensure `Moon` is imported from `lucide-react` (add it to the existing lucide import if missing). Add the translations hook at the top of the component body:
```tsx
    const tc = useTranslations("AdminReservations.multiCalendar");
```

- [ ] **Step 2: Fetch Beds24 per-night prices for the visible month**

Add state near the other component state:
```tsx
    const [beds24Prices, setBeds24Prices] = useState<Record<string, Beds24DayInfo> | null>(null);
```
Add an effect (uses the existing `currentMonth`, `propertyId`):
```tsx
    useEffect(() => {
        let cancelled = false;
        const first = new Date(getYear(currentMonth), getMonth(currentMonth), 1);
        const nextFirst = new Date(getYear(currentMonth), getMonth(currentMonth) + 1, 1);
        getBeds24DailyPrices(format(first, "yyyy-MM-dd"), format(nextFirst, "yyyy-MM-dd"))
            .then((r) => { if (!cancelled) setBeds24Prices(r.ok ? (r.prices[propertyId] ?? null) : null); })
            .catch(() => { if (!cancelled) setBeds24Prices(null); });
        return () => { cancelled = true; };
    }, [currentMonth, propertyId]);
```

- [ ] **Step 3: Render Beds24 price + minStay moon in each day cell (fallback to flat price)**

In the monthly day-cell render, replace the flat-price block (the `{(pricePerNight || pricePerNight === 0) && date && !isDateReserved(date) && (...)}` span, ~lines 416-420) with:
```tsx
                                                    {date && !isDateReserved(date) && (() => {
                                                        const key = format(date, "yyyy-MM-dd");
                                                        const info = beds24Prices?.[key];
                                                        if (info && typeof info.price === "number") {
                                                            return (
                                                                <span className="flex items-center gap-1 leading-none">
                                                                    {info.minStay != null && info.minStay > 1 && (
                                                                        <span title={tc("minStayNights", { count: info.minStay })} className="flex items-center gap-0.5 text-[8px] font-bold text-[#c4c4c4] dark:text-white/30">
                                                                            <Moon className="size-2.5" />{info.minStay}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[9px] font-bold tabular-nums text-[#525252] dark:text-white/70">€{info.price}</span>
                                                                </span>
                                                            );
                                                        }
                                                        if (pricePerNight || pricePerNight === 0) {
                                                            return (
                                                                <span className="text-[8px] font-semibold text-[#bbb] dark:text-admin-dark-text-secondary leading-none">
                                                                    {pricePerNight > 0 ? `€${pricePerNight}` : "-"}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
```

- [ ] **Step 4: Parallelogram bars via the shared visuals**

In the monthly bar render (~lines 442-509), change the bar so it uses the shared parallelogram + colors + channel badges:

Replace the bar `className` `border`/`rounded` classes and the `style` `borderRadius`/`background` with the shared visuals. Specifically:
- Remove the `border shadow-sm` + per-type border classes and the `borderRadius: …` inline style; add `clipPath: getBarClipPath(!bar.isStart, !bar.isEnd)` to the style.
- Set `background`:
```tsx
                                                background: isAirbnb ? AIRBNB_HATCH
                                                    : isBooking ? BOOKING_HATCH
                                                    : isBlock ? BLOCK_HATCH
                                                    : getReservationStatusColor(effectiveReservationStatus(bar.status, bar.checkOut)),
```
Replace the Airbnb glyph (the `Globe` box, ~lines 477-480) with `<ChannelBadge kind="airbnb-box" />`, the Booking glyph (~lines 481-484) with `<ChannelBadge kind="booking-box" />`, and keep the `Ban` icon for `isBlock`. The label text (`"Airbnb"` / `"Booking.com"` / `bar.guestName`) and the initial-avatar for reservations stay unchanged. Keep the end-price span and the hover handlers unchanged.

(If `Globe`/`Building2` become unused after this, remove them from the lucide import; `Building2` is now provided via `ChannelBadge`.)

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/admin/properties/AnnualCalendarTab.tsx
git commit -m "feat(properties): Month view — parallelogram bars + Beds24 per-night prices"
```

---

## Verification (post-implementation, done by the user)

- `npx tsc --noEmit` + `npm run build` clean (gated per task); `npx tsx scripts/test-beds24-lens.ts` → ALL PASS.
- **Timeline & hub unchanged:** after Tasks 1–2, the Timeline and the reservations hub render identically (bars, colors, badges, hatches; iCal↔Beds24 swap).
- **Month parity (super_admin):** property → Calendar → Month: reservation bars are diagonal parallelograms with correct status colors (diagonal at real check-in/out, straight at week cuts); Airbnb blocks show the real `FaAirbnb` logo; per-night € prices show for a Beds24-linked property (moon on `minStay>1`), flat nightly price fallback otherwise; the hover card is unchanged; dark mode.
- **Beds24 toggle (super_admin):** the `iCal · Beds24` toggle appears on the Calendar tab; Beds24 swaps anonymous iCal Airbnb blocks for rich `beds24_bookings` bars (name + € + badge) in **both** Timeline and Month; back to iCal restores; a non-super_admin never sees the toggle.

## Non-goals

- Year view visuals unchanged. Timeline layout unchanged. No `€` toggle in the Month view (prices always on). The Beds24 lens does not persist. The hub page is only refactored to share the transform.
