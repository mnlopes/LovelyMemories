# Preview Beds24 no calendário de reservas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch de preview no calendário admin que, nas propriedades ligadas ao Beds24, substitui as barras iCal anónimas por reservas Beds24 ricas (nome+preço), com todas as barras do calendário em paralelogramo estilo Hospitable.

**Architecture:** Server action nova em `app/actions/beds24.ts` (service-role; RLS intocada) devolve as `beds24_bookings` já no shape do calendário. A página `/admin/reservations` compõe os dados quando o switch (super_admin only, estado local) está ligado. `MultiCalendarView` ganha barras diagonais (`clip-path`) em TODAS as barras e um variant rosa read-only para `is_beds24`.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role), Tailwind, next-intl (en/pt/he), sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-07-14-beds24-calendar-preview-design.md`

## Global Constraints

- Sem migrações, sem policies novas, sem estado persistido — o preview é uma lente local.
- Nada muda em produção/site público; iCal continua a alimentar `blocked_dates`.
- i18n: qualquer string nova entra em `messages/{en,pt,he}.json` em paridade de chaves.
- Não há suite de testes; verificação = `npx tsc --noEmit` + `npm run build` + verificação visual no dev server (porta 3001, launch config "dev").
- Falha da action → toast + switch volta a OFF; nunca calendário vazio.
- Visual premium: transições suaves, dark mode impecável (classes `dark:` como o resto do ficheiro).
- Diagonais: ~9px de inclinação; aresta reta quando a barra continua para fora do mês visível.

---

### Task 1: Server action `getBeds24CalendarPreview`

**Files:**
- Modify: `app/actions/beds24.ts` (acrescentar no fim do ficheiro)
- Create: `scripts/check-beds24-calendar-preview.ts` (inspetor, mesma família dos scripts existentes)

**Interfaces:**
- Consumes: `guard()` e `getSupabaseAdmin()` já existentes no ficheiro.
- Produces: `getBeds24CalendarPreview(): Promise<Beds24CalendarPreviewResult>` e os tipos `Beds24CalendarBooking` / `Beds24CalendarPreviewResult` — a Task 4 importa os três de `@/app/actions/beds24`.

- [ ] **Step 1: Acrescentar tipos + action no fim de `app/actions/beds24.ts`**

Nota: o ficheiro é `'use server'` — só pode exportar funções async e TYPES (interfaces/type são apagados na compilação; consts NÃO podem, armadilha conhecida do handoff).

```ts
// ---------- Preview do calendário admin (switch iCal ↔ Beds24) ----------

export interface Beds24CalendarBooking {
    id: string;                 // `b24-${beds24_booking_id}` — nunca colide com uuids
    property_id: string;        // internal_property_id (propriedade do site)
    guest_name: string;
    check_in: string;           // arrival (YYYY-MM-DD)
    check_out: string;          // departure
    total_price: number | null;
    channel: string | null;
    status: string;             // 'confirmed' | 'new'
    is_airbnb: boolean;
    is_beds24: true;
}

export type Beds24CalendarPreviewResult =
    | { ok: true; internalPropertyIds: string[]; bookings: Beds24CalendarBooking[] }
    | { ok: false; error: string };

/**
 * Reservas Beds24 das propriedades LIGADAS (internal_property_id preenchido), já no
 * shape que o MultiCalendarView consome. Alimenta o switch de preview do calendário
 * admin — leitura via service-role (RLS das beds24_* fica intocada). Nunca lança:
 * o cliente decide mostrar toast e voltar a iCal.
 */
export async function getBeds24CalendarPreview(): Promise<Beds24CalendarPreviewResult> {
    try {
        await guard();
        const supabase = await getSupabaseAdmin();
        const { data: props, error: propsError } = await supabase
            .from('beds24_properties')
            .select('beds24_property_id, internal_property_id')
            .not('internal_property_id', 'is', null);
        if (propsError) throw propsError;
        const linkMap = new Map<number, string>(
            (props ?? []).map((p) => [p.beds24_property_id as number, p.internal_property_id as string]),
        );
        if (!linkMap.size) return { ok: true, internalPropertyIds: [], bookings: [] };

        // 60 dias de histórico chegam para o calendário; evita puxar a tabela inteira.
        const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
        const { data: rows, error } = await supabase
            .from('beds24_bookings')
            .select('beds24_booking_id, beds24_property_id, status, arrival, departure, guest_first_name, guest_last_name, price, channel')
            .in('beds24_property_id', [...linkMap.keys()])
            .in('status', ['confirmed', 'new'])
            .gte('departure', since)
            .order('arrival', { ascending: true })
            .limit(500);
        if (error) throw error;

        const bookings: Beds24CalendarBooking[] = (rows ?? [])
            .filter((r) => r.arrival && r.departure)
            .map((r) => ({
                id: `b24-${r.beds24_booking_id}`,
                property_id: linkMap.get(r.beds24_property_id as number)!,
                guest_name: [r.guest_first_name, r.guest_last_name].filter(Boolean).join(' ') || 'Airbnb guest',
                check_in: r.arrival as string,
                check_out: r.departure as string,
                total_price: typeof r.price === 'number' ? r.price : (r.price ? Number(r.price) : null),
                channel: (r.channel as string) ?? null,
                status: r.status as string,
                is_airbnb: ((r.channel as string) ?? '').toLowerCase().includes('airbnb'),
                is_beds24: true,
            }));
        return { ok: true, internalPropertyIds: [...new Set(linkMap.values())], bookings };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Preview failed' };
    }
}
```

- [ ] **Step 2: Criar `scripts/check-beds24-calendar-preview.ts`** (a action exige cookies/role; o script valida a QUERY com service-role direto, como os outros `scripts/check-*`)

```ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: props } = await supabase
        .from('beds24_properties')
        .select('beds24_property_id, name, internal_property_id')
        .not('internal_property_id', 'is', null);
    console.log(`Propriedades ligadas: ${props?.length ?? 0}`);
    for (const p of props ?? []) console.log(`  ${p.beds24_property_id} ${p.name} -> ${p.internal_property_id}`);
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
        .from('beds24_bookings')
        .select('beds24_booking_id, beds24_property_id, status, arrival, departure, guest_first_name, guest_last_name, price, channel')
        .in('beds24_property_id', (props ?? []).map((p) => p.beds24_property_id))
        .in('status', ['confirmed', 'new'])
        .gte('departure', since);
    if (error) throw error;
    console.log(`Bookings no preview: ${rows?.length ?? 0}`);
    for (const r of (rows ?? []).slice(0, 10)) {
        console.log(`  #${r.beds24_booking_id} ${r.status} ${r.arrival}→${r.departure} ${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''} €${r.price ?? '-'} [${r.channel ?? '-'}]`);
    }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Correr o script e verificar dados reais**

Run: `npx tsx scripts/check-beds24-calendar-preview.ts`
Expected: lista de propriedades ligadas (≥1, Virtudes One) e bookings ≥ 7 (reservas reais importadas), com nomes/preços/datas plausíveis.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros. (scripts/ está fora do tsconfig — normal não ser verificado.)

- [ ] **Step 5: Commit**

```bash
git add app/actions/beds24.ts scripts/check-beds24-calendar-preview.ts
git commit -m "feat(beds24): action getBeds24CalendarPreview para o switch do calendario admin"
```

---

### Task 2: Barras diagonais (Hospitable) em TODO o calendário

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Consumes: nada novo.
- Produces: helper interno `getBarClipPath(startsBefore: boolean, endsAfter: boolean): string`, usado por todas as barras (reservas + blocked). A Task 3 reutiliza-o.

Contexto: `getBarStyle` (linhas ~143-170) JÁ posiciona as barras ao meio-dia (offsets de meia célula ±2px). A mudança é só a forma: `clip-path` em paralelogramo (~9px de inclinação), aresta RETA no lado em que a barra continua para fora do mês. `clip-path` corta `border`/`shadow` — as barras passam a fills sólidos/hatched sem border nem shadow (mais limpo, igual ao mockup aprovado).

- [ ] **Step 1: Adicionar o helper depois de `getBarStyle`**

```tsx
    // Paralelogramo à Hospitable: arestas diagonais (~9px) no check-in/check-out ao
    // meio-dia; aresta reta quando a barra continua para fora do mês visível.
    const getBarClipPath = (startsBefore: boolean, endsAfter: boolean) => {
        const l = startsBefore ? 0 : 9;
        const r = endsAfter ? 0 : 9;
        return `polygon(${l}px 0, 100% 0, calc(100% - ${r}px) 100%, 0 100%)`;
    };
```

- [ ] **Step 2: Aplicar às barras de reservas** — no bloco `reservationsByProperty[propId]?.map(...)` (linhas ~353-370), substituir o `<div>` da barra por:

```tsx
                                                <div
                                                    key={res.id}
                                                    onClick={() => setSelectedReservation(res)}
                                                    title={`${res.guest_name || t('guest')} · ${format(new Date(res.check_in), 'd MMM', { locale: dateLocale })} → ${format(new Date(res.check_out), 'd MMM', { locale: dateLocale })}`}
                                                    className={cn(
                                                        "absolute top-1/2 -translate-y-1/2 h-8 cursor-pointer flex items-center px-3 z-10 transition-all hover:brightness-110",
                                                        getStatusColor(effectiveStatus),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, clipPath: getBarClipPath(startsBefore, endsAfter) }}
                                                >
```
(remove: classes `border`, `shadow-sm`, `rounded-l-*`/`rounded-r-*` e as suas condições `startsBefore/endsAfter` — as variáveis continuam a ser usadas pelo clipPath. O conteúdo interno nome+preço fica igual. `px-2`→`px-3` para compensar a diagonal.)

- [ ] **Step 3: Aplicar às barras blocked (iCal Airbnb + owner)** — no bloco `visibleBlockedDates?.filter(...)` (linhas ~383-401), substituir `className`/`style` do `<div>`:

```tsx
                                                <div
                                                    key={block.id}
                                                    className={cn(
                                                        "absolute top-1/2 -translate-y-1/2 h-9 flex items-center px-3 z-0 transition-all",
                                                    )}
                                                    style={{
                                                        left: `${style.left}px`,
                                                        width: `${style.width}px`,
                                                        clipPath: getBarClipPath(startsBefore, endsAfter),
                                                        background: isAirbnb
                                                            ? 'repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)'
                                                            : 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)'
                                                    }}
                                                >
```
(remove as classes de border/rounded; sobe um tom os hatches — sem border precisam de mais contraste; conteúdo interno fica igual.)

- [ ] **Step 4: Type-check + verificação visual**

Run: `npx tsc --noEmit`
Expected: sem erros.
Verificação visual (dev server "dev", `/en/admin/reservations`, vista Calendar): todas as barras (verdes diretas, rosa iCal, cinza owner) em paralelogramo; back-to-back bookings mostram o dia de turnover partilhado; barra que atravessa o limite do mês tem aresta reta nesse lado; dark mode legível.

- [ ] **Step 5: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): barras diagonais estilo Hospitable em todas as reservas e bloqueios"
```

---

### Task 3: Variant Beds24 nas barras + legenda

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Consumes: `getBarClipPath` (Task 2); reservas com `is_beds24: true` no array `reservations` (a Task 4 injeta-as).
- Produces: barras rosa sólidas read-only com selo "Beds24"; entrada de legenda condicional. Chave i18n nova `multiCalendar.legend.beds24` (Task 4 adiciona aos messages).

- [ ] **Step 1: Variant na barra de reserva** — dentro do mesmo map da Task 2 Step 2, no topo do callback acrescentar `const isBeds24 = !!res.is_beds24;` e ajustar o `<div>`:

```tsx
                                                <div
                                                    key={res.id}
                                                    onClick={() => { if (!isBeds24) setSelectedReservation(res); }}
                                                    title={`${res.guest_name || t('guest')} · ${format(new Date(res.check_in), 'd MMM', { locale: dateLocale })} → ${format(new Date(res.check_out), 'd MMM', { locale: dateLocale })}`}
                                                    className={cn(
                                                        "absolute top-1/2 -translate-y-1/2 h-8 flex items-center px-3 z-10 transition-all",
                                                        isBeds24
                                                            ? "bg-rose-500 text-white cursor-default hover:brightness-105 animate-in fade-in duration-300"
                                                            : cn("cursor-pointer hover:brightness-110", getStatusColor(effectiveStatus)),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, clipPath: getBarClipPath(startsBefore, endsAfter) }}
                                                >
                                                    <div className="flex justify-between items-center w-full gap-2 overflow-hidden">
                                                        <span className="text-[10px] font-bold truncate shrink leading-none">{res.guest_name || t('guest')}</span>
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            {res.total_price ? <span className="text-[10px] font-bold whitespace-nowrap leading-none">€{res.total_price}</span> : null}
                                                            {isBeds24 && <span className="rounded bg-white/25 px-1 py-px text-[8px] font-bold uppercase tracking-wider leading-none">Beds24</span>}
                                                        </span>
                                                    </div>
                                                </div>
```

- [ ] **Step 2: Legenda condicional** — no bloco de legenda do header (linhas ~253-259), acrescentar após a entrada Airbnb:

```tsx
                        {reservations.some((r: any) => r.is_beds24) && (
                            <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-rose-500"></div>{t('legend.beds24')}</div>
                        )}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros (a chave i18n só entra na Task 4 — `t()` de next-intl não é verificado pelo tsc).

- [ ] **Step 4: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): variant rosa read-only com selo Beds24 e legenda condicional"
```

---

### Task 4: Switch premium na página + composição de dados + i18n

**Files:**
- Modify: `app/[locale]/admin/reservations/page.tsx`
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json`

**Interfaces:**
- Consumes: `getBeds24CalendarPreview`, tipo `Beds24CalendarPreviewResult` (Task 1); `role` já carregado na página; `toast` (sonner) já importado.
- Produces: preview funcional ponta-a-ponta.

- [ ] **Step 1: Import + estado na página** — junto aos outros imports/estados:

```tsx
import { getBeds24CalendarPreview, type Beds24CalendarPreviewResult } from "@/app/actions/beds24";
```
```tsx
    // Preview Beds24 no calendário (super_admin; lente local, não persiste)
    const [beds24Preview, setBeds24Preview] = useState(false);
    const [beds24Data, setBeds24Data] = useState<Extract<Beds24CalendarPreviewResult, { ok: true }> | null>(null);
    const [beds24Loading, setBeds24Loading] = useState(false);

    const toggleBeds24Preview = async () => {
        if (beds24Preview) { setBeds24Preview(false); setBeds24Data(null); return; }
        setBeds24Loading(true);
        try {
            const r = await getBeds24CalendarPreview();
            if (!r.ok) { toast.error(t('beds24PreviewError')); return; }
            setBeds24Data(r);
            setBeds24Preview(true);
        } catch {
            toast.error(t('beds24PreviewError'));
        } finally {
            setBeds24Loading(false);
        }
    };
```

- [ ] **Step 2: Composição dos dados do calendário** — antes do `return`, junto ao `filteredReservations`:

```tsx
    // Com o preview ligado: nas propriedades ligadas ao Beds24, as barras iCal
    // (blocked_dates airbnb_booking) saem e entram as reservas Beds24 ricas.
    // Diretas do site e bloqueios manuais ficam. Só afeta a vista Calendar.
    const previewPropertyIds = beds24Preview && beds24Data ? new Set(beds24Data.internalPropertyIds) : null;
    const calendarBlockedDates = previewPropertyIds
        ? blockedDates.filter((b: any) => !(b.source === 'airbnb_booking' && previewPropertyIds.has(b.property_id)))
        : blockedDates;
    const calendarReservations = previewPropertyIds
        ? [
            ...reservations.filter((r: any) => !(r.is_airbnb && previewPropertyIds.has(r.property_id))),
            ...beds24Data!.bookings.map((b) => ({ ...b, property_name: propertiesMap[b.property_id]?.title || 'Unknown Property' })),
        ]
        : reservations;
```

- [ ] **Step 3: Passar ao MultiCalendarView** — trocar as props:

```tsx
                <MultiCalendarView
                    reservations={calendarReservations}
                    properties={propertiesMap}
                    propertyImages={propertyImagesMap}
                    locale={locale}
                    blockedDates={calendarBlockedDates}
                    onRefresh={fetchData}
                />
```

- [ ] **Step 4: Switch premium no header** — dentro do `<div className="flex gap-3">` do header (antes do pill Calendar/List), renderizado só para super_admin em vista calendar:

```tsx
                    {view === 'calendar' && role === 'super_admin' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-lg p-1 transition-colors duration-300">
                            <span className="pl-2 text-[9px] font-bold uppercase tracking-widest text-[#a3a3a3]">{t('dataSource')}</span>
                            <button
                                onClick={() => { if (beds24Preview) void toggleBeds24Preview(); }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!beds24Preview ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                            >
                                iCal
                            </button>
                            <button
                                onClick={() => { if (!beds24Preview) void toggleBeds24Preview(); }}
                                disabled={beds24Loading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-60 ${beds24Preview ? 'bg-rose-500 text-white shadow-sm' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                            >
                                <span className={`size-1.5 rounded-full ${beds24Preview ? 'bg-white' : 'bg-rose-400'} ${beds24Loading ? 'animate-pulse' : ''}`} />
                                Beds24
                            </button>
                        </div>
                    )}
```

- [ ] **Step 5: i18n** — acrescentar em `AdminReservations` nos três ficheiros (paridade):

en.json: `"dataSource": "Source",` + `"beds24PreviewError": "Couldn't load Beds24 data — showing iCal.",` e em `multiCalendar.legend`: `"beds24": "Beds24"`
pt.json: `"dataSource": "Fonte",` + `"beds24PreviewError": "Não foi possível carregar os dados Beds24 — a mostrar iCal.",` e `"beds24": "Beds24"`
he.json: `"dataSource": "מקור",` + `"beds24PreviewError": "לא ניתן לטעון נתוני Beds24 — מציג iCal.",` e `"beds24": "Beds24"`

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: ambos limpos (build obrigatório — mexemos em exports consumidos de ficheiro 'use server').

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/admin/reservations/page.tsx" messages/en.json messages/pt.json messages/he.json
git commit -m "feat(calendar): switch iCal<->Beds24 no calendario admin (super_admin, preview local)"
```

---

### Task 5: Verificação visual ponta-a-ponta

**Files:** nenhum (verificação).

- [ ] **Step 1: Dev server + login super_admin** — launch config "dev" (porta 3001), `/en/admin/reservations`, vista Calendar.

- [ ] **Step 2: Checklist OFF (default)** — barras todas diagonais; iCal rosa hatched "Airbnb" nas ligadas; sem switch visível para admin normal (verificar com conta João se disponível; senão inspecionar o guard no código).

- [ ] **Step 3: Checklist ON** — ligar o switch: Virtudes One mostra as reservas reais com nome+preço+selo Beds24 no lugar das barras anónimas; propriedades não ligadas inalteradas; bloqueios manuais continuam; clicar numa barra Beds24 NÃO abre o detail sheet; legenda mostra "Beds24"; navegar meses mantém o preview; desligar volta ao estado exato.

- [ ] **Step 4: Dark mode + mobile** — repetir o essencial em dark e com sidebar colapsada.

- [ ] **Step 5: Screenshot de prova + atualizar o handoff** — acrescentar ao `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md` (secção de pedidos do Marcelo) uma linha "✅ preview Beds24 no calendário admin (spec/plan 2026-07-14-beds24-calendar-preview*)" e commitar:

```bash
git add docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md
git commit -m "docs(beds24): marcar preview do calendario como feito no handoff"
```
