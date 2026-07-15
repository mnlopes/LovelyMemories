# Calendar Tab — restore Month + Year views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring back the **Month** and **Year** calendar views inside the per-property Calendar tab, under a single Timeline · Month · Year switcher.

**Architecture:** Recover the old self-contained `AnnualCalendarTab` component from git (deleted in `8bc92ea`) and make it *externally controllable* via optional `view`/`onViewChange` props. `PropertyCalendarTab` gains a 3-way view switcher: `timeline` renders the existing `MultiCalendarView` (unchanged), `monthly`/`annual` render the restored component forced into that view. No data-source unification — the restored component keeps its own Supabase fetch.

**Tech Stack:** Next.js 16 App Router, React client components, next-intl, date-fns, Supabase browser client, Tailwind (admin tokens).

## Global Constraints

- No test suite exists; verification is `npx tsc --noEmit` + `npm run build` (per CLAUDE.md). Treat these as the pass/fail gate in every task.
- i18n keys must stay in parity across `messages/{en,pt,he}.json`; `he` mirrors `en` for this namespace (existing convention).
- Use the `useRouter`/`Link` wrappers from `i18n/routing.ts`, not `next/navigation` (already the case in `PropertyCalendarTab`).
- Match existing admin tokens: `admin-border`, `dark:border-admin-dark-border`, `dark:bg-admin-dark-surface`, text `#171717`/`#a3a3a3`/`#999`.
- Do NOT push; work stays on local `main` until the user runs the E2E and pushes (per handoff).

---

### Task 1: Restore `AnnualCalendarTab` and make it externally controllable

**Files:**
- Create (from git): `components/admin/properties/AnnualCalendarTab.tsx`
- Modify (same file, 4 edits): interface, signature, view state, ViewToggle render sites

**Interfaces:**
- Produces: default export `AnnualCalendarTab` with props
  `{ propertyId: string; activeLang?: string; view?: "annual" | "monthly"; onViewChange?: (v: "annual" | "monthly") => void }`.
  When `view` is provided the component is *controlled* (uses the prop, hides its own toggle, and routes all internal view changes through `onViewChange`). When omitted, behaviour is identical to the original.

- [ ] **Step 1: Recover the file verbatim from git**

Run (from repo root):
```bash
git show 0c2e5c0:components/admin/properties/AnnualCalendarTab.tsx > components/admin/properties/AnnualCalendarTab.tsx
```

- [ ] **Step 2: Verify it compiles as-is (baseline)**

Run: `npx tsc --noEmit`
Expected: PASS (no errors referencing `AnnualCalendarTab.tsx`). The recovered file is self-contained; this confirms a clean baseline before edits.

- [ ] **Step 3: Add the two optional props to the interface**

Find (lines ~14-17):
```tsx
interface AnnualCalendarTabProps {
    propertyId: string;
    activeLang?: string;
}
```
Replace with:
```tsx
interface AnnualCalendarTabProps {
    propertyId: string;
    activeLang?: string;
    /** When provided, the component is controlled: it uses this view and hides its own toggle. */
    view?: CalendarView;
    /** Called whenever the view should change (both the toggle and the "click a mini-month" action). */
    onViewChange?: (v: CalendarView) => void;
}
```
(`CalendarView` is already declared in the file as `type CalendarView = "annual" | "monthly";`.)

- [ ] **Step 4: Wire controlled/uncontrolled view state**

Find (line ~42, the signature):
```tsx
export default function AnnualCalendarTab({ propertyId, activeLang = "en" }: AnnualCalendarTabProps) {
```
Replace with:
```tsx
export default function AnnualCalendarTab({ propertyId, activeLang = "en", view: controlledView, onViewChange }: AnnualCalendarTabProps) {
```

Find (line ~49):
```tsx
    const [view, setView] = useState<CalendarView>("annual");
```
Replace with:
```tsx
    const [internalView, setInternalView] = useState<CalendarView>("annual");
    const view = controlledView ?? internalView;
    const setView = (v: CalendarView) => {
        onViewChange?.(v);
        if (controlledView === undefined) setInternalView(v);
    };
    const isControlled = controlledView !== undefined;
```

Rationale: every existing call site (`setView(v)` in the toggle, `setCurrentMonth(...); setView("monthly")` in the mini-month click) keeps working. In controlled mode `setView` notifies the parent (which flips the outer switcher and passes `view` back) and skips internal state; in uncontrolled mode it behaves exactly as before.

- [ ] **Step 5: Hide the internal toggle when controlled (both render sites)**

Find (line ~354):
```tsx
                    <ViewToggle />
                </div>
```
Replace with:
```tsx
                    {!isControlled && <ViewToggle />}
                </div>
```

Find (line ~544):
```tsx
                <ViewToggle />
            </div>
```
Replace with:
```tsx
                {!isControlled && <ViewToggle />}
            </div>
```
(The mini-month click handlers at ~573/~585 already call `setView("monthly")`, which now routes through the wrapper — no edit needed there.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors. Confirms controlled/uncontrolled wiring is type-safe and `CalendarView` references resolve.

- [ ] **Step 7: Commit**

```bash
git add components/admin/properties/AnnualCalendarTab.tsx
git commit -m "feat(properties): restore AnnualCalendarTab, add controlled view props"
```

---

### Task 2: Add the 3-way switcher to `PropertyCalendarTab` + i18n

**Files:**
- Modify: `components/admin/properties/PropertyCalendarTab.tsx`
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (`AdminReservations.propertyTabs`)

**Interfaces:**
- Consumes: `AnnualCalendarTab` default export with `{ propertyId, activeLang, view, onViewChange }` from Task 1; `MultiCalendarView` (unchanged); `usePropertyCalendarData`.
- Produces: user-facing behaviour only (no exported API change).

- [ ] **Step 1: Add the three i18n keys (en)**

In `messages/en.json`, find the `propertyTabs` block (line ~348) and replace:
```json
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet."
        }
```
with:
```json
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet.",
            "viewTimeline": "Timeline",
            "viewMonth": "Month",
            "viewYear": "Year"
        }
```

- [ ] **Step 2: Add the three i18n keys (pt)**

In `messages/pt.json`, find the `propertyTabs` block (line ~339) and replace:
```json
            "loading": "A carregar…",
            "noReservations": "Ainda não há reservas nesta propriedade."
        }
```
with:
```json
            "loading": "A carregar…",
            "noReservations": "Ainda não há reservas nesta propriedade.",
            "viewTimeline": "Timeline",
            "viewMonth": "Mês",
            "viewYear": "Ano"
        }
```

- [ ] **Step 3: Add the three i18n keys (he — mirrors en)**

In `messages/he.json`, find the `propertyTabs` block (line ~1450) and replace:
```json
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet."
        }
```
with:
```json
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet.",
            "viewTimeline": "Timeline",
            "viewMonth": "Month",
            "viewYear": "Year"
        }
```

- [ ] **Step 4: Rewrite `PropertyCalendarTab.tsx` with the switcher**

Replace the entire contents of `components/admin/properties/PropertyCalendarTab.tsx` with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { CalendarRange, CalendarDays, LayoutGrid } from "lucide-react";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import AnnualCalendarTab from "@/components/admin/properties/AnnualCalendarTab";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

type CalendarTabView = "timeline" | "monthly" | "annual";

export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const router = useRouter();
    const [view, setView] = useState<CalendarTabView>("timeline");
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, refresh } =
        usePropertyCalendarData(propertyId, locale);

    // MultiCalendarView expects `properties` as a Map keyed by property id ({ [id]: property }),
    // but usePropertyCalendarData returns a one-element array. Convert here.
    const propertiesMap = properties[0] ? { [properties[0].id]: properties[0] } : {};

    const segments: [CalendarTabView, string, typeof CalendarRange][] = [
        ["timeline", t("viewTimeline"), CalendarRange],
        ["monthly", t("viewMonth"), CalendarDays],
        ["annual", t("viewYear"), LayoutGrid],
    ];

    return (
        <div className="space-y-4">
            {/* Property dropdown — stays ABOVE the view switcher, applies to all three views */}
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

            {/* Single 3-way view switcher: Timeline · Month · Year */}
            <div className="flex items-center gap-0.5 bg-[#f3f3f3] dark:bg-white/10 p-1 rounded-xl w-fit">
                {segments.map(([v, label, Icon]) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
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
                    reservations={reservations}
                    properties={propertiesMap}
                    propertyImages={propertyImages}
                    blockedDates={blockedDates}
                    locale={locale}
                    canShowPrices={true}
                    initialRange={31}
                    onRefresh={refresh}
                />
            ) : (
                <AnnualCalendarTab
                    propertyId={propertyId}
                    activeLang={locale}
                    view={view}
                    onViewChange={(v) => setView(v)}
                />
            )}
        </div>
    );
}
```

Notes: the switcher reuses the exact pill styling from the old `ViewToggle` (segmented control, `#f3f3f3`/`dark:bg-white/10` track, active = white surface + shadow) so it feels native. `onViewChange={(v) => setView(v)}` maps the restored component's `"annual"|"monthly"` directly onto the outer view type — including the Year→mini-month click, which fires `onViewChange("monthly")` and flips the switcher to Month.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. Confirms the `AnnualCalendarTab` import path/default export, the prop types (`view`/`onViewChange`), and the icon imports all resolve.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: PASS (compiles + collects page data). Catches any `'use client'`/server-boundary or missing-key issues that `tsc` alone misses.

- [ ] **Step 7: Commit**

```bash
git add components/admin/properties/PropertyCalendarTab.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(properties): Timeline/Month/Year switcher on the Calendar tab"
```

---

## Verification (post-implementation, done by the user)

- `npx tsc --noEmit` and `npm run build` clean (gated in tasks above).
- i18n key parity: `viewTimeline`/`viewMonth`/`viewYear` present in en/pt/he.
- Manual E2E (super_admin, auth-gated): open a property → **Calendar** tab → switch **Timeline / Month / Year**; in **Year**, click a mini-month → lands on **Month** for that month; the property dropdown still switches property in every view; dark mode.

## Non-goals

- Unifying the data source of the two components (`AnnualCalendarTab` keeps its own fetch).
- Bringing the € Preços rail or the iCal↔Beds24 lens into the Month/Year grids (they keep the simple `price_per_night`).
