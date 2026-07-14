# Beds24 Booking Detail Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicar numa barra Beds24 no calendário admin abre um slide-over read-only com a ficha rica da reserva (hóspede, estadia, financeiro com breakdown, contacto, meta).

**Architecture:** Nova server action `getBeds24BookingDetail` (fetch-on-click, service-role, guard super_admin) + novo client component `Beds24BookingDetailSheet` (framer-motion slide-over, igual ao `ReservationDetailSheet` existente) ligado no `MultiCalendarView`. O shape magro do preview ganha só `beds24_booking_id` (sem PII).

**Tech Stack:** Next.js 16 App Router, server actions, Supabase service-role, framer-motion, date-fns, next-intl, Tailwind (paleta admin rose/neutral + dark mode).

**Spec:** `docs/superpowers/specs/2026-07-14-beds24-booking-detail-design.md`

## Global Constraints

- Read-only: NENHUMA ação que mude estado (sem cancelar/mensagens/notas).
- PII (email/telefone) só sai do servidor na action de detalhe, nunca no payload do preview.
- i18n: traduzir só `en` + `pt`; `he.json` recebe as MESMAS chaves com os valores em inglês (paridade estrutural next-intl obrigatória).
- Não há suite de testes: verificação = `npx tsc --noEmit` + `npm run build` + `npm run test:security` + prova visual em localhost:3001.
- Actions em ficheiros `'use server'` só podem exportar funções async — interfaces/types são OK (apagados na compilação), mas NUNCA exportar `const`. Correr `npm run build` (não só tsc) depois de mexer em `app/actions/beds24.ts`.
- Não fazer push para origin (decisão do Marcelo).

---

### Task 1: Server action `getBeds24BookingDetail` + id numérico no shape magro

**Files:**
- Modify: `app/actions/beds24.ts` (secção "Preview do calendário admin", linhas ~252-322)

**Interfaces:**
- Produces: `interface Beds24BookingDetail` (abaixo), `getBeds24BookingDetail(beds24BookingId: number): Promise<Beds24BookingDetailResult>`, e campo novo `beds24_booking_id: number` em `Beds24CalendarBooking`.
- Consumes: `guard()`, `getSupabaseAdmin()` já existentes no ficheiro.

- [ ] **Step 1: Adicionar `beds24_booking_id` ao shape magro**

Em `Beds24CalendarBooking` (linha ~254), acrescentar depois de `id`:

```ts
    beds24_booking_id: number;  // id numérico Beds24 — para abrir a ficha de detalhe
```

E no mapeamento dentro de `getBeds24CalendarPreview` (linha ~305), acrescentar depois de `id: \`b24-${r.beds24_booking_id}\`,`:

```ts
                beds24_booking_id: r.beds24_booking_id as number,
```

- [ ] **Step 2: Acrescentar a action de detalhe no fim do ficheiro**

```ts
// ---------- Ficha de detalhe read-only (clique na barra Beds24 do calendário) ----------

export interface Beds24InvoiceItem {
    description: string;
    amount: number;
}

export interface Beds24BookingDetail {
    beds24_booking_id: number;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    channel: string | null;
    status: string | null;
    sub_status: string | null;
    arrival: string;
    departure: string;
    nights: number;
    num_adult: number | null;
    num_child: number | null;
    property_title: string | null;
    price: number | null;
    commission: number | null;
    net_payout: number | null;
    invoice_items: Beds24InvoiceItem[];
    api_reference: string | null;
    booking_time: string | null;
    modified_time: string | null;
    first_seen_via: string | null;
}

export type Beds24BookingDetailResult =
    | { ok: true; booking: Beds24BookingDetail }
    | { ok: false; error: string };

/**
 * Detalhe completo de UMA reserva Beds24 (fetch-on-click do calendário admin).
 * PII (email/telefone) só sai daqui, nunca no preview magro. Nunca lança.
 */
export async function getBeds24BookingDetail(beds24BookingId: number): Promise<Beds24BookingDetailResult> {
    try {
        await guard();
        const supabase = await getSupabaseAdmin();
        const { data: row, error } = await supabase
            .from('beds24_bookings')
            .select('*')
            .eq('beds24_booking_id', beds24BookingId)
            .single();
        if (error || !row) throw new Error(error?.message || 'Reserva não encontrada');

        // Título da propriedade do site via ligação beds24_properties → properties
        let propertyTitle: string | null = null;
        const { data: link } = await supabase
            .from('beds24_properties')
            .select('internal_property_id, name')
            .eq('beds24_property_id', row.beds24_property_id)
            .single();
        if (link?.internal_property_id) {
            const { data: prop } = await supabase
                .from('properties')
                .select('title')
                .eq('id', link.internal_property_id)
                .single();
            propertyTitle = (prop?.title as string) ?? (link?.name as string) ?? null;
        } else {
            propertyTitle = (link?.name as string) ?? null;
        }

        // invoiceItems best-effort do raw JSONB (forma varia; nunca rebenta)
        const rawItems = (row.raw as Record<string, unknown> | null)?.invoiceItems;
        const invoiceItems: Beds24InvoiceItem[] = Array.isArray(rawItems)
            ? rawItems
                .map((it: Record<string, unknown>) => {
                    const amount = Number(it.lineTotal ?? it.amount ?? NaN);
                    const description = String(it.description ?? it.type ?? '').trim();
                    return { description, amount };
                })
                .filter((it) => it.description !== '' && Number.isFinite(it.amount) && it.amount !== 0)
            : [];

        const toNum = (v: unknown): number | null => {
            const n = typeof v === 'number' ? v : v ? Number(v) : NaN;
            return Number.isFinite(n) ? n : null;
        };
        const price = toNum(row.price);
        const commission = toNum(row.commission);
        const nights = Math.max(1, Math.round(
            (new Date(row.departure as string).getTime() - new Date(row.arrival as string).getTime()) / 86400000,
        ));

        return {
            ok: true,
            booking: {
                beds24_booking_id: row.beds24_booking_id as number,
                guest_name: [row.guest_first_name, row.guest_last_name].filter(Boolean).join(' ') || 'Airbnb guest',
                guest_email: (row.guest_email as string) ?? null,
                guest_phone: (row.guest_phone as string) ?? null,
                channel: (row.channel as string) ?? null,
                status: (row.status as string) ?? null,
                sub_status: (row.sub_status as string) ?? null,
                arrival: row.arrival as string,
                departure: row.departure as string,
                nights,
                num_adult: toNum(row.num_adult),
                num_child: toNum(row.num_child),
                property_title: propertyTitle,
                price,
                commission,
                net_payout: price !== null ? price - (commission ?? 0) : null,
                invoice_items: invoiceItems,
                api_reference: (row.api_reference as string) ?? null,
                booking_time: (row.booking_time as string) ?? null,
                modified_time: (row.modified_time as string) ?? null,
                first_seen_via: (row.first_seen_via as string) ?? null,
            },
        };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Detail failed' };
    }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/actions/beds24.ts
git commit -m "feat(beds24): action getBeds24BookingDetail + id numerico no shape do preview"
```

---

### Task 2: Chaves i18n `AdminReservations.beds24Detail` (en + pt; he em inglês)

**Files:**
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` (dentro de `"AdminReservations"`, ao lado de `"multiCalendar"`)

**Interfaces:**
- Produces: namespace `AdminReservations.beds24Detail` consumido pelo componente da Task 3 via `useTranslations('AdminReservations.beds24Detail')`.

- [ ] **Step 1: Adicionar o bloco em `messages/en.json`**

Dentro de `"AdminReservations"`, adicionar (vírgulas conforme a posição):

```json
"beds24Detail": {
    "checkIn": "Check-in",
    "checkOut": "Check-out",
    "nights": "{count, plural, one {# night} other {# nights}}",
    "adults": "{count, plural, one {# adult} other {# adults}}",
    "children": "{count, plural, one {# child} other {# children}}",
    "financial": "Financial",
    "total": "Total",
    "commission": "Channel commission",
    "netPayout": "Net payout",
    "contact": "Contact",
    "contactMasked": "Contact managed by the channel",
    "meta": "Details",
    "booking": "Booking",
    "reference": "Channel ref.",
    "bookedAt": "Booked on",
    "modifiedAt": "Last change",
    "origin": "Origin",
    "statusConfirmed": "Confirmed",
    "statusNew": "New",
    "statusCancelled": "Cancelled",
    "loadError": "Could not load the booking"
}
```

- [ ] **Step 2: Adicionar o bloco em `messages/pt.json`**

```json
"beds24Detail": {
    "checkIn": "Check-in",
    "checkOut": "Check-out",
    "nights": "{count, plural, one {# noite} other {# noites}}",
    "adults": "{count, plural, one {# adulto} other {# adultos}}",
    "children": "{count, plural, one {# criança} other {# crianças}}",
    "financial": "Financeiro",
    "total": "Total",
    "commission": "Comissão do canal",
    "netPayout": "Payout líquido",
    "contact": "Contacto",
    "contactMasked": "Contacto gerido pelo canal",
    "meta": "Detalhes",
    "booking": "Reserva",
    "reference": "Ref. do canal",
    "bookedAt": "Reservada em",
    "modifiedAt": "Última alteração",
    "origin": "Origem",
    "statusConfirmed": "Confirmada",
    "statusNew": "Nova",
    "statusCancelled": "Cancelada",
    "loadError": "Não foi possível carregar a reserva"
}
```

- [ ] **Step 3: Adicionar o MESMO bloco do en.json em `messages/he.json`** (valores em inglês, sem tradução — paridade estrutural).

- [ ] **Step 4: Verificar paridade**

Run: `node -e "const en=require('./messages/en.json'),pt=require('./messages/pt.json'),he=require('./messages/he.json');const k=o=>Object.keys(o.AdminReservations.beds24Detail).sort().join();console.log(k(en)===k(pt)&&k(en)===k(he)?'PARITY OK':'MISMATCH')"`
Expected: `PARITY OK`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/he.json
git commit -m "feat(i18n): chaves AdminReservations.beds24Detail (en/pt; he estrutural em ingles)"
```

---

### Task 3: Componente `Beds24BookingDetailSheet`

**Files:**
- Create: `components/admin/reservations/Beds24BookingDetailSheet.tsx`

**Interfaces:**
- Consumes: `getBeds24BookingDetail`, `Beds24BookingDetail` de `@/app/actions/beds24` (Task 1); namespace i18n da Task 2.
- Produces: `export function Beds24BookingDetailSheet({ beds24BookingId, onClose }: { beds24BookingId: number | null; onClose: () => void })`.

- [ ] **Step 1: Criar o componente completo**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { X, Globe, Mail, Phone, Users, Home, ArrowRight, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBeds24BookingDetail, type Beds24BookingDetail } from "@/app/actions/beds24";

interface Beds24BookingDetailSheetProps {
    beds24BookingId: number | null;
    onClose: () => void;
}

const euro = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export function Beds24BookingDetailSheet({ beds24BookingId, onClose }: Beds24BookingDetailSheetProps) {
    const t = useTranslations("AdminReservations.beds24Detail");
    const params = useParams();
    const locale = (params?.locale as string) || "en";
    const dateLocale = locale === "pt" ? pt : undefined;
    const [booking, setBooking] = useState<Beds24BookingDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (beds24BookingId === null) { setBooking(null); return; }
        let cancelled = false;
        setLoading(true);
        getBeds24BookingDetail(beds24BookingId)
            .then((r) => {
                if (cancelled) return;
                if (r.ok) { setBooking(r.booking); }
                else { toast.error(t("loadError")); onClose(); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [beds24BookingId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (beds24BookingId === null) return null;

    const initials = booking
        ? booking.guest_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
        : "";
    const isAirbnb = (booking?.channel ?? "").toLowerCase().includes("airbnb");
    const statusKey = booking?.status === "confirmed" ? "statusConfirmed"
        : booking?.status === "new" ? "statusNew" : "statusCancelled";
    const statusClasses = booking?.status === "confirmed"
        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
        : booking?.status === "new"
            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
            : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10";
    const fmtDay = (d: string) => format(new Date(d), "EEE, d MMM", { locale: dateLocale });
    const fmtStamp = (d: string) => format(new Date(d), "d MMM yyyy, HH:mm", { locale: dateLocale });

    return (
        <AnimatePresence>
            <motion.div
                key="b24-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 z-[100]"
            />
            <motion.div
                key="b24-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-admin-dark-surface shadow-2xl z-[101] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
                    {loading || !booking ? (
                        <div className="flex items-center gap-4 animate-pulse">
                            <div className="size-12 rounded-full bg-gray-100 dark:bg-white/10" />
                            <div className="space-y-2">
                                <div className="h-4 w-40 rounded bg-gray-100 dark:bg-white/10" />
                                <div className="h-3 w-28 rounded bg-gray-100 dark:bg-white/10" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="size-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-sm shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">{booking.guest_name}</h2>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 flex items-center gap-1">
                                        <Globe className="size-2.5" />
                                        {isAirbnb ? "Airbnb" : (booking.channel || "Direct")}
                                    </span>
                                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border", statusClasses)}>
                                        {t(statusKey)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-white/5 text-gray-400">
                                        Beds24
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading || !booking ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-28 rounded-2xl bg-gray-50 dark:bg-white/5" />
                            <div className="h-36 rounded-2xl bg-gray-50 dark:bg-white/5" />
                            <div className="h-20 rounded-2xl bg-gray-50 dark:bg-white/5" />
                        </div>
                    ) : (
                        <>
                            {/* Estadia */}
                            <div className="rounded-2xl bg-[#fafafa] dark:bg-white/5 p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("checkIn")}</p>
                                        <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-1 capitalize">{fmtDay(booking.arrival)}</p>
                                    </div>
                                    <div className="text-center text-gray-400">
                                        <ArrowRight className="size-4 mx-auto" />
                                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{t("nights", { count: booking.nights })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("checkOut")}</p>
                                        <p className="text-[15px] font-bold text-gray-900 dark:text-white mt-1 capitalize">{fmtDay(booking.departure)}</p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200/60 dark:border-white/10 mt-4 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5 min-w-0"><Home className="size-3.5 shrink-0" /><span className="truncate">{booking.property_title || "—"}</span></span>
                                    {(booking.num_adult ?? 0) > 0 && (
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <Users className="size-3.5" />
                                            {t("adults", { count: booking.num_adult ?? 0 })}
                                            {(booking.num_child ?? 0) > 0 ? ` · ${t("children", { count: booking.num_child ?? 0 })}` : ""}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Financeiro */}
                            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("financial")}</p>
                                <div className="space-y-1.5 text-[13px] tabular-nums">
                                    {booking.invoice_items.length > 0 ? (
                                        booking.invoice_items.map((it, i) => (
                                            <div key={i} className="flex justify-between gap-3">
                                                <span className="text-gray-500 dark:text-gray-400 truncate">{it.description}</span>
                                                <span className={cn("shrink-0", it.amount < 0 ? "text-red-500" : "text-gray-900 dark:text-white")}>{euro(it.amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            {booking.price !== null && (
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500 dark:text-gray-400">{t("total")}</span>
                                                    <span className="text-gray-900 dark:text-white">{euro(booking.price)}</span>
                                                </div>
                                            )}
                                            {booking.commission !== null && booking.commission !== 0 && (
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500 dark:text-gray-400">{t("commission")}</span>
                                                    <span className="text-red-500">−{euro(booking.commission)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {booking.net_payout !== null && (
                                        <div className="flex justify-between gap-3 border-t border-gray-100 dark:border-white/10 mt-2 pt-2.5">
                                            <span className="font-bold text-gray-900 dark:text-white">{t("netPayout")}</span>
                                            <span className="font-black text-base text-gray-900 dark:text-white">{euro(booking.net_payout)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contacto */}
                            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("contact")}</p>
                                {booking.guest_email || booking.guest_phone ? (
                                    <div className="space-y-2.5 text-[13px]">
                                        {booking.guest_email && (
                                            <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:underline min-w-0">
                                                <Mail className="size-3.5 text-gray-400 shrink-0" /><span className="truncate">{booking.guest_email}</span>
                                            </a>
                                        )}
                                        {booking.guest_phone && (
                                            <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 hover:underline">
                                                <Phone className="size-3.5 text-gray-400 shrink-0" />{booking.guest_phone}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <p className="flex items-center gap-2 text-xs text-gray-400"><ShieldCheck className="size-3.5" />{t("contactMasked")}</p>
                                )}
                            </div>

                            {/* Meta */}
                            <div className="px-1 space-y-1.5 text-[11px] text-gray-400">
                                <div className="flex justify-between gap-3"><span>{t("booking")}</span><span className="font-mono">#{booking.beds24_booking_id}</span></div>
                                {booking.api_reference && (
                                    <div className="flex justify-between gap-3"><span>{t("reference")}</span><span className="font-mono truncate max-w-[200px]">{booking.api_reference}</span></div>
                                )}
                                {booking.booking_time && (
                                    <div className="flex justify-between gap-3"><span>{t("bookedAt")}</span><span>{fmtStamp(booking.booking_time)}</span></div>
                                )}
                                {booking.modified_time && (
                                    <div className="flex justify-between gap-3"><span>{t("modifiedAt")}</span><span>{fmtStamp(booking.modified_time)}</span></div>
                                )}
                                {booking.first_seen_via && (
                                    <div className="flex justify-between gap-3"><span>{t("origin")}</span><span className="capitalize">{booking.first_seen_via}</span></div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/admin/reservations/Beds24BookingDetailSheet.tsx
git commit -m "feat(beds24): sheet de detalhe read-only da reserva (estadia/financeiro/contacto/meta)"
```

---

### Task 4: Ligar o clique no `MultiCalendarView`

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx` (imports ~linha 9, estado ~linha 24, barra ~linhas 364-386, sheets ~linha 446)

**Interfaces:**
- Consumes: `Beds24BookingDetailSheet` (Task 3); `res.beds24_booking_id` presente no shape magro (Task 1).

- [ ] **Step 1: Import**

Depois da linha `import { ReservationDetailSheet } ...`:

```tsx
import { Beds24BookingDetailSheet } from "@/components/admin/reservations/Beds24BookingDetailSheet";
```

- [ ] **Step 2: Estado**

Depois de `const [selectedReservation, setSelectedReservation] = useState<any | null>(null);`:

```tsx
    const [selectedBeds24Id, setSelectedBeds24Id] = useState<number | null>(null);
```

- [ ] **Step 3: Tornar a barra Beds24 clicável**

Na barra (linha ~369), substituir:

```tsx
                                                    onClick={() => { if (!isBeds24) setSelectedReservation(res); }}
```

por:

```tsx
                                                    onClick={() => { if (isBeds24) setSelectedBeds24Id(res.beds24_booking_id); else setSelectedReservation(res); }}
```

E na className da barra Beds24 (linha ~374), substituir `cursor-default` por `cursor-pointer`:

```tsx
                                                            ? "bg-rose-500 text-white cursor-pointer hover:brightness-105 animate-in fade-in duration-300"
```

- [ ] **Step 4: Renderizar o sheet**

Depois de `<ReservationDetailSheet ... />` (linha ~446):

```tsx
            <Beds24BookingDetailSheet beds24BookingId={selectedBeds24Id} onClose={() => setSelectedBeds24Id(null)} />
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): clique na barra Beds24 abre a ficha de detalhe"
```

---

### Task 5: Verificação final (build + security + prova visual)

**Files:** nenhum novo.

- [ ] **Step 1: Build de produção** (obrigatório: mexemos em `app/actions/beds24.ts`, ficheiro 'use server')

Run: `npm run build`
Expected: build limpo, sem erros de collect page data.

- [ ] **Step 2: Security smoke tests**

Run: `npm run test:security`
Expected: PASS.

- [ ] **Step 3: Prova visual em localhost:3001** (dev server via preview config "dev")

1. Login super_admin → `/en/admin/reservations` → vista Calendar → switch Source = Beds24.
2. Clicar na barra "Emilia Neukranz €806.5" (Virtudes One) → sheet abre com skeleton → dados reais (nome, datas, noites, financeiro, contacto ou estado mascarado, meta com #id).
3. Clicar numa barra Beds24 SEM invoiceItems no raw → financeiro cai para total+comissão sem rebentar.
4. Fechar por overlay e por X. Verificar dark mode. Verificar que barras de reservas diretas continuam a abrir o sheet antigo.
5. Screenshot como prova.

- [ ] **Step 4: Commit final (se houver ajustes) + atualizar handoff**

Acrescentar ao `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md`, na secção dos pedidos do Marcelo, uma linha a marcar a ficha de detalhe como feita (local, não pushed).

```bash
git add -A
git commit -m "docs(handoff): ficha de detalhe Beds24 no calendario feita (local)"
```
