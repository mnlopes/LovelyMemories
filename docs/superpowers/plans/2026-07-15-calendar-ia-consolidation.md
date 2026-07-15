# Calendar IA Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each property a dedicated tabbed page (Overview / Calendar / Reservations) whose Calendar reuses the multi-property timeline component, and wire navigation so clicking a property anywhere lands there — retiring the divergent annual-calendar modal.

**Architecture:** The multi-property timeline at `/admin/reservations` stays the portfolio hub. `/admin/properties/[id]` becomes a tabbed client shell; the Calendar tab renders the existing `MultiCalendarView` filtered to one property (default Month), with a Lodgify-style property-switcher dropdown; the Reservations tab lists that property's reservations. The property name in the hub and the "View Calendar" action both route to `?tab=calendar`.

**Tech Stack:** Next.js 16 App Router, next-intl, Supabase browser client, Tailwind, lucide-react, date-fns. Spec: `docs/superpowers/specs/2026-07-15-calendar-ia-consolidation-design.md`.

## Global Constraints

- Locales `en`, `pt`, `he` must stay in key-parity in `messages/{en,pt,he}.json`; `he` may mirror `en` copy for the `AdminReservations` namespace (pre-existing convention — Hebrew pass is out of scope).
- Use the `Link`/`useRouter` wrappers from `i18n/routing.ts`, never `next/navigation` for navigation (reading `useSearchParams` from `next/navigation` is allowed).
- No DB schema changes, no new migrations.
- Verification per task = `npx tsc --noEmit` **and** `npm run build` clean (build catches `'use server'`/page-collection issues tsc misses). There is no unit-test runner.
- Admin routes are auth-gated (super_admin); full click-through E2E needs login and is a final manual step, not automatable here.
- Do not touch `/admin/beds24` (Lab) or the Beds24 data model.

---

### Task 1: Tabbed shell on the property page

**Files:**
- Create: `components/admin/properties/PropertyDetailTabs.tsx`
- Modify: `app/[locale]/admin/properties/[id]/page.tsx` (wrap `PropertyEditorForm` render, lines 78-84)

**Interfaces:**
- Produces: `PropertyDetailTabs({ propertyId, locale, isNew, overview })` — client component. `overview: React.ReactNode` is the server-rendered editor form shown in the Overview tab. Renders a tab bar (Overview / Calendar / Reservations) driven by the `?tab=` query param (`overview` default; `calendar`; `reservations`). Tabs are `Link`s (i18n) to `?tab=<id>` so they deep-link and support the back button. For `isNew`, render only `overview` with no tab bar.

- [ ] **Step 1: Create the tab shell**

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { CalendarDays, ListChecks, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropertyCalendarTab } from "@/components/admin/properties/PropertyCalendarTab";
import { PropertyReservationsTab } from "@/components/admin/properties/PropertyReservationsTab";

type TabId = "overview" | "calendar" | "reservations";

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
    const t = useTranslations("AdminReservations.propertyTabs");
    const sp = useSearchParams();
    const active = (sp.get("tab") as TabId) || "overview";

    if (isNew) return <>{overview}</>;

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: "overview", label: t("overview"), icon: <SlidersHorizontal className="size-4" /> },
        { id: "calendar", label: t("calendar"), icon: <CalendarDays className="size-4" /> },
        { id: "reservations", label: t("reservations"), icon: <ListChecks className="size-4" /> },
    ];

    return (
        <div className="space-y-6">
            <nav className="flex gap-1 border-b border-admin-border dark:border-admin-dark-border">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={`/admin/properties/${propertyId}?tab=${tab.id}`}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors",
                            active === tab.id
                                ? "border-[#171717] dark:border-white text-[#171717] dark:text-white"
                                : "border-transparent text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </Link>
                ))}
            </nav>

            {active === "overview" && overview}
            {active === "calendar" && <PropertyCalendarTab propertyId={propertyId} locale={locale} />}
            {active === "reservations" && <PropertyReservationsTab propertyId={propertyId} locale={locale} />}
        </div>
    );
}
```

- [ ] **Step 2: Stub the two tab components so the shell compiles**

Create `components/admin/properties/PropertyCalendarTab.tsx`:

```tsx
"use client";
export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    return <div className="py-10 text-center text-sm text-[#a3a3a3]">calendar: {propertyId} / {locale}</div>;
}
```

Create `components/admin/properties/PropertyReservationsTab.tsx`:

```tsx
"use client";
export function PropertyReservationsTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    return <div className="py-10 text-center text-sm text-[#a3a3a3]">reservations: {propertyId} / {locale}</div>;
}
```

- [ ] **Step 3: Add `locale` to the params destructure + import the shell**

The route is `app/[locale]/admin/properties/[id]` so `params` already carries `locale`. At the top of the file, widen the params type and destructure `locale` (lines 11-14):

```tsx
    params,
    searchParams
}: {
    params: Promise<{ id: string; locale: string }>,
    searchParams: Promise<{ mode?: string, parent_id?: string }>
}) {
    const { id, locale } = await params;
```

Add the import near the other imports (top of file):

```tsx
import { PropertyDetailTabs } from "@/components/admin/properties/PropertyDetailTabs";
```

- [ ] **Step 3b: Wrap the editor in the tab shell**

Replace the final `return (...)` (lines 78-84) with:

```tsx
    return (
        <PropertyDetailTabs
            propertyId={id}
            locale={locale}
            isNew={isNew}
            overview={
                <PropertyEditorForm
                    isEditing={!isNew}
                    initialData={propertyData || undefined}
                    mode={mode as "building" | undefined}
                />
            }
        />
    );
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm run build`
Expected: builds successfully; `/[locale]/admin/properties/[id]` compiles.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/admin/properties/[id]/page.tsx" components/admin/properties/PropertyDetailTabs.tsx components/admin/properties/PropertyCalendarTab.tsx components/admin/properties/PropertyReservationsTab.tsx
git commit -m "feat(properties): tabbed property page shell (overview/calendar/reservations)"
```

---

### Task 2: Property-scoped calendar data loader

**Files:**
- Create: `components/admin/properties/usePropertyCalendarData.ts`

**Interfaces:**
- Produces: `usePropertyCalendarData(propertyId, locale)` → `{ loading, properties, reservations, blockedDates, propertyImages, refresh }`. Shapes match what `MultiCalendarView` consumes: `properties` is a one-element array of `{ id, title, subtitle, city, mainImage, ... }`; `reservations` is the enhanced reservation rows for this property; `blockedDates` are this property's `blocked_dates`; `propertyImages` maps `{ [id]: url }`. Also produces `allProperties` (id + title only) for the property-switcher dropdown in Task 3.

This mirrors `fetchData` in `app/[locale]/admin/reservations/page.tsx:131-192` but filters to one property. Reuse the same translation/enhancement logic.

- [ ] **Step 1: Implement the hook**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const tr = (field: any, locale: string): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (typeof field === "object") return field[locale] || field.en || Object.values(field)[0] || "";
    return "";
};

export function usePropertyCalendarData(propertyId: string, locale: string) {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [blockedDates, setBlockedDates] = useState<any[]>([]);
    const [propertyImages, setPropertyImages] = useState<Record<string, string>>({});
    const [allProperties, setAllProperties] = useState<{ id: string; title: string }[]>([]);

    const refresh = useCallback(async () => {
        setLoading(true);
        const [resRes, propRes, blockRes, allRes] = await Promise.all([
            supabase.from("reservations").select("*, properties:property_id(*)").eq("property_id", propertyId).order("created_at", { ascending: false }),
            supabase.from("properties").select("id, title, subtitle, images, city, address, bedrooms, bathrooms, max_guests, is_multi_unit").eq("id", propertyId).single(),
            supabase.from("blocked_dates").select("*").eq("property_id", propertyId),
            supabase.from("properties").select("id, title").order("title", { ascending: true }),
        ]);

        const prop = propRes.data;
        if (prop) {
            const mainImage = prop.images?.[0]?.url || (typeof prop.images?.[0] === "string" ? prop.images[0] : "");
            const enhanced = { ...prop, title: tr(prop.title, locale) || "Untitled Property", subtitle: tr(prop.subtitle, locale), city: tr(prop.city, locale), mainImage };
            setProperties([enhanced]);
            setPropertyImages(mainImage ? { [prop.id]: mainImage } : {});
        }
        setReservations((resRes.data || []).map((res: any) => ({ ...res, property_name: tr(res.properties?.title, locale) })));
        setBlockedDates(blockRes.data || []);
        setAllProperties((allRes.data || []).map((p: any) => ({ id: p.id, title: tr(p.title, locale) || p.id })));
        setLoading(false);
    }, [propertyId, locale]);

    useEffect(() => { void refresh(); }, [refresh]);

    return { loading, properties, reservations, blockedDates, propertyImages, allProperties, refresh };
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/admin/properties/usePropertyCalendarData.ts
git commit -m "feat(properties): property-scoped calendar data loader"
```

---

### Task 3: Calendar tab with property switcher

**Files:**
- Modify: `components/admin/properties/PropertyCalendarTab.tsx` (replace the Task 1 stub)

**Interfaces:**
- Consumes: `usePropertyCalendarData` (Task 2); `MultiCalendarView` with the `initialRange` prop added in Task 5.
- Produces: the Calendar tab UI — a property-switcher dropdown (routes to `/admin/properties/<id>?tab=calendar`) above `MultiCalendarView` filtered to one property, opening in Month.

- [ ] **Step 1: Implement the Calendar tab**

```tsx
"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { MultiCalendarView } from "@/components/admin/reservations/MultiCalendarView";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

export function PropertyCalendarTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations.propertyTabs");
    const router = useRouter();
    const { loading, properties, reservations, blockedDates, propertyImages, allProperties, refresh } =
        usePropertyCalendarData(propertyId, locale);

    return (
        <div className="space-y-4">
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

            {loading ? (
                <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("loading")}</div>
            ) : (
                <MultiCalendarView
                    reservations={reservations}
                    properties={properties}
                    propertyImages={propertyImages}
                    blockedDates={blockedDates}
                    locale={locale}
                    canShowPrices={true}
                    initialRange={31}
                    onRefresh={refresh}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify build (blocked on Task 5's `initialRange` prop)**

If implementing out of order, add the `initialRange` prop in Task 5 first. Then:

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/admin/properties/PropertyCalendarTab.tsx
git commit -m "feat(properties): calendar tab reusing MultiCalendarView with property switcher"
```

---

### Task 4: Reservations tab

**Files:**
- Modify: `components/admin/properties/PropertyReservationsTab.tsx` (replace the Task 1 stub)

**Interfaces:**
- Consumes: `usePropertyCalendarData` (Task 2) for `reservations`; `ReservationListCard` (`components/admin/reservations/ReservationListCard.tsx`).
- Produces: a simple list of this property's reservations using the existing `ReservationListCard` presentation.

- [ ] **Step 1: Implement the Reservations tab**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ReservationListCard } from "@/components/admin/reservations/ReservationListCard";
import { usePropertyCalendarData } from "@/components/admin/properties/usePropertyCalendarData";

export function PropertyReservationsTab({ propertyId, locale }: { propertyId: string; locale: string }) {
    const t = useTranslations("AdminReservations");
    const { loading, reservations } = usePropertyCalendarData(propertyId, locale);

    const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    const isNew = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / 36e5 <= 24;

    const visible = reservations.filter((r) => r.status !== "cancelled");

    if (loading) return <div className="py-16 text-center text-sm text-[#a3a3a3] animate-pulse">{t("propertyTabs.loading")}</div>;
    if (!visible.length) return <div className="py-16 text-center text-sm text-[#a3a3a3]">{t("propertyTabs.noReservations")}</div>;

    return (
        <div className="space-y-3">
            {visible.map((r) => (
                <ReservationListCard
                    key={r.id}
                    reservation={r}
                    t={t}
                    formatDate={formatDate}
                    isNew={isNew}
                    onOpenDetail={() => {}}
                    onOpenMenu={() => {}}
                />
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/admin/properties/PropertyReservationsTab.tsx
git commit -m "feat(properties): reservations tab scoped to the property"
```

---

### Task 5: `initialRange` prop on MultiCalendarView (default Month for single property)

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx` (props type at line 26; the range state at line 29)

**Interfaces:**
- Produces: optional prop `initialRange?: 7 | 14 | 31` (default `31` — matches the hub's current default so hub behaviour is unchanged). The range state is `const [rangeDays, setRangeDays] = useState<7 | 14 | 31>(31)` at line 29. The Calendar tab passes `31`.

- [ ] **Step 1: Add the prop to the props type**

In `MultiCalendarViewProps` (line 26 area) add:

```tsx
    initialRange?: 7 | 14 | 31;
```

- [ ] **Step 2: Destructure it and use it as the initial value**

Add `initialRange = 31` to the destructured props on the `MultiCalendarView` function signature (line 26), and change line 29 from `useState<7 | 14 | 31>(31)` to:

```tsx
    const [rangeDays, setRangeDays] = useState<7 | 14 | 31>(initialRange);
```

- [ ] **Step 3: Verify hub unchanged + build**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run build`
Expected: clean. The hub at `/admin/reservations` does not pass `initialRange`, so it still defaults to `31d`.

- [ ] **Step 4: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): initialRange prop on MultiCalendarView (default 31d)"
```

---

### Task 6: Navigation wiring — property name link + retire the modal

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx` (property name block, lines 420-426)
- Modify: `app/[locale]/admin/properties/page.tsx` ("View Calendar" button line 484-494; `onOpenCalendar` line 586; modal lines 640-666; `calendarPropertyId` state line 33; `AnnualCalendarTab` import line 9)

**Interfaces:**
- Consumes: the tab shell route `/admin/properties/<id>?tab=calendar` (Task 1).

- [ ] **Step 1: Make the hub property name a link**

In `MultiCalendarView.tsx`, add the import:

```tsx
import { Link } from "@/i18n/routing";
```

Wrap the property title block (lines 420-426, the `isSidebarOpen ? (...)` branch) so the title links to the property's Calendar tab:

```tsx
                                        {isSidebarOpen ? (
                                            <Link href={`/admin/properties/${propId}?tab=calendar`} className="w-full text-left hover:opacity-80 transition-opacity">
                                                <span className="text-xs font-bold text-[#171717] dark:text-white block truncate leading-tight">{propData.title}</span>
                                                <span className="text-[9px] text-[#a3a3a3] font-bold uppercase tracking-wider block truncate mt-1">
                                                    {propData.city || 'Sem Zona'}
                                                </span>
                                            </Link>
                                        ) : (
```

(Keep the collapsed-sidebar `else` branch as-is.)

- [ ] **Step 2: Point "View Calendar" at the tab instead of the modal**

In `app/[locale]/admin/properties/page.tsx`, change the "View Calendar" button (lines 484-494) from opening the modal to navigating. Replace `onClick={(e) => { e.stopPropagation(); setCalendarPropertyId(property.id); }}` with:

```tsx
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/${locale}/admin/properties/${property.id}?tab=calendar`;
                                                    }}
```

Do the same for the `onOpenCalendar` handler passed to the mobile card (line 586): change it to `onOpenCalendar={() => window.location.href = `/${locale}/admin/properties/${property.id}?tab=calendar`}`.

- [ ] **Step 3: Remove the modal and its state/import**

Delete the modal block (lines ~640-666, the `{calendarPropertyId && (...)}` JSX including `<AnnualCalendarTab .../>`), the `calendarPropertyId` state declaration (line 33), and the `AnnualCalendarTab` import (line 9).

- [ ] **Step 4: Confirm `AnnualCalendarTab` is now unused, then delete it**

Run: `grep -rn "AnnualCalendarTab" app components`
Expected: no matches. If none, delete the component file:

```bash
git rm components/admin/properties/AnnualCalendarTab.tsx
```

If there ARE other references, leave the file in place and note it.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: clean (no dangling `calendarPropertyId` / `AnnualCalendarTab` references).

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "components/admin/reservations/MultiCalendarView.tsx" "app/[locale]/admin/properties/page.tsx"
git commit -m "feat(nav): property name + View Calendar route to the property Calendar tab; retire annual modal"
```

---

### Task 7: i18n strings + final verification

**Files:**
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (add `AdminReservations.propertyTabs`)

**Interfaces:**
- Consumes: translation keys used in Tasks 1, 3, 4.

- [ ] **Step 1: Add the `propertyTabs` block to all three locales**

Under the `AdminReservations` namespace in `messages/en.json`:

```json
        "propertyTabs": {
            "overview": "Overview",
            "calendar": "Calendar",
            "reservations": "Reservations",
            "switchProperty": "Property",
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet."
        }
```

In `messages/pt.json`:

```json
        "propertyTabs": {
            "overview": "Visão geral",
            "calendar": "Calendário",
            "reservations": "Reservas",
            "switchProperty": "Propriedade",
            "loading": "A carregar…",
            "noReservations": "Ainda não há reservas nesta propriedade."
        }
```

In `messages/he.json` (mirror `en` per the AdminReservations convention):

```json
        "propertyTabs": {
            "overview": "Overview",
            "calendar": "Calendar",
            "reservations": "Reservations",
            "switchProperty": "Property",
            "loading": "Loading…",
            "noReservations": "No reservations for this property yet."
        }
```

- [ ] **Step 2: Verify key parity**

Run: `node -e "const e=require('./messages/en.json').AdminReservations.propertyTabs,p=require('./messages/pt.json').AdminReservations.propertyTabs,h=require('./messages/he.json').AdminReservations.propertyTabs;const k=Object.keys(e).sort().join(',');console.log(k===Object.keys(p).sort().join(',')&&k===Object.keys(h).sort().join(',')?'PARITY OK':'PARITY MISMATCH')"`
Expected: `PARITY OK`

- [ ] **Step 3: Full build**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Manual E2E checklist (super_admin, needs login)**

Verify in the running app:
- Hub `/admin/reservations` → click a property name → lands on `/admin/properties/<id>?tab=calendar`, Calendar tab active, Month range, that property's bars/prices shown.
- Property-switcher dropdown → switching navigates to another property's Calendar tab.
- iCal↔Beds24 source lens and € Preços behave as in the hub.
- Properties list → "View Calendar" icon → opens the same Calendar tab (no modal).
- Reservations tab → lists that property's reservations; empty state shows for a property with none.
- Overview tab → the editor form works exactly as before.
- Deep link `/admin/properties/<id>?tab=reservations` opens the right tab directly.
- Dark mode looks clean on the tab bar, switcher, and tabs.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/he.json
git commit -m "i18n(properties): propertyTabs strings (en/pt/he)"
```

---

## Notes for implementation

- **Visual polish (pixel-perfect):** the code above is structural. When building the tab bar, property-switcher, and empty/loading states, apply the `frontend-design` skill to reach the Guesty/Hostaway/Lodgify finish — spacing, type scale, hover/active states, dark mode. Match existing admin tokens (`admin-border`, `admin-dark-*`, the `#171717`/`#a3a3a3` greys already used in these files).
- **`ReservationListCard` handlers:** the Reservations tab passes no-op `onOpenDetail`/`onOpenMenu` for now (list is read-only in this iteration). Wiring the detail sheet into the tab is a fast-follow, not in scope.
- **Fast-follows (out of scope, noted in spec):** per-property "Year" view; folding the Beds24 Lab connection tooling into a property "Connections" tab; channel-value financial model.
```
