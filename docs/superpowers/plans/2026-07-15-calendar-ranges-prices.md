# Calendar Ranges + Nightly Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seletor 7d/14d/31d no multi-calendário admin (janela deslizante, células mais largas nas vistas curtas) + toggle "€ Preços" que mostra o preço da noite nas células livres das propriedades ligadas ao Beds24.

**Architecture:** Refactor do `MultiCalendarView` de grelha estritamente mensal para janela genérica (`rangeStart/rangeEnd`, largura de célula por alcance, posicionamento de barras por índice de dia — funciona através de fronteiras de mês). Nova action `getBeds24DailyPrices` que agrega `getRoomCalendar` (já existente) das propriedades ligadas.

**Tech Stack:** Next.js 16, server actions, `lib/beds24/calendar.ts` (existente), date-fns (`differenceInCalendarDays`, `addDays`), Tailwind, next-intl.

**Spec:** `docs/superpowers/specs/2026-07-15-calendar-ranges-prices-design.md`

## Global Constraints

- A vista **31d** preserva EXATAMENTE o comportamento atual (mês de calendário, células 48px, navegação por mês).
- Preços: toggle off por defeito; **só super_admin** (prop `canShowPrices` + guard server-side); **desativado na vista 31d**; só propriedades ligadas; preço NUNCA aparece numa noite coberta por barra (reserva ou bloqueio).
- `app/actions/beds24.ts` é `'use server'`: só exportar funções async e types; nunca `const`. Correr `npm run build` (não só tsc) depois de o alterar.
- Actions novas nunca lançam — discriminated union `{ok:true,…}|{ok:false,error}`.
- i18n en+pt reais; he = valores em inglês (paridade estrutural obrigatória next-intl).
- Sem suite de testes: verificação = `npx tsc --noEmit` + `npm run build` + prova visual.
- Não fazer push para origin.

---

### Task 1: Action `getBeds24DailyPrices`

**Files:**
- Modify: `app/actions/beds24.ts` (fim do ficheiro; import novo no topo)

**Interfaces:**
- Consumes: `guard()`, `getSupabaseAdmin()` (existentes), `getRoomCalendar` de `@/lib/beds24/calendar` (existente: `(roomId: number, startDate: string, endDate: string) => Promise<CalendarDay[]>`, endDate EXCLUSIVO, devolve `{date, price, available, minStay}[]`).
- Produces: `getBeds24DailyPrices(startDate: string, endDate: string): Promise<Beds24DailyPricesResult>` com `prices: Record<internal_property_id, Record<'YYYY-MM-DD', number>>`.

- [ ] **Step 1: Import no topo do ficheiro** (junto aos outros imports de lib/beds24):

```ts
import { getRoomCalendar } from '@/lib/beds24/calendar';
```

- [ ] **Step 2: Acrescentar no fim do ficheiro:**

```ts
// ---------- Preços por noite (toggle € do multi-calendário admin) ----------

export type Beds24DailyPricesResult =
    | { ok: true; prices: Record<string, Record<string, number>> }
    | { ok: false; error: string };

/**
 * Preço da noite (price1) das propriedades LIGADAS, para o toggle "€" do calendário.
 * `endDate` é EXCLUSIVO (semântica do getRoomCalendar) — o cliente passa rangeEnd+1.
 * Best-effort por quarto: um quarto que falhe sai do mapa sem derrubar o resto. Nunca lança.
 */
export async function getBeds24DailyPrices(startDate: string, endDate: string): Promise<Beds24DailyPricesResult> {
    try {
        await guard();
        const supabase = await getSupabaseAdmin();
        const { data: props, error } = await supabase
            .from('beds24_properties')
            .select('internal_property_id, beds24_room_id')
            .not('internal_property_id', 'is', null)
            .not('beds24_room_id', 'is', null);
        if (error) throw error;
        const prices: Record<string, Record<string, number>> = {};
        await Promise.all((props ?? []).map(async (p) => {
            try {
                const days = await getRoomCalendar(Number(p.beds24_room_id), startDate, endDate);
                const map: Record<string, number> = {};
                for (const d of days) {
                    if (typeof d.price === 'number') map[d.date] = d.price;
                }
                if (Object.keys(map).length > 0) prices[p.internal_property_id as string] = map;
            } catch {
                // best-effort: quarto com erro fica de fora
            }
        }));
        return { ok: true, prices };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Prices failed' };
    }
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit` → sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/actions/beds24.ts
git commit -m "feat(beds24): action getBeds24DailyPrices para o toggle de precos do calendario"
```

---

### Task 2: Chaves i18n do seletor + preços

**Files:**
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` — dentro de `"AdminReservations"` → `"multiCalendar"` (bloco já existente nas 3 línguas).

**Interfaces:**
- Produces: chaves `range7, range14, range31, prices, pricesDisabledHint, pricesError` em `AdminReservations.multiCalendar`, consumidas nas Tasks 3 e 4.

- [ ] **Step 1: en.json** — dentro de `"multiCalendar"`, acrescentar:

```json
"range7": "7d",
"range14": "14d",
"range31": "31d",
"prices": "Prices",
"pricesDisabledHint": "Prices need the 7d or 14d view",
"pricesError": "Could not load nightly prices"
```

- [ ] **Step 2: pt.json** — idem:

```json
"range7": "7d",
"range14": "14d",
"range31": "31d",
"prices": "Preços",
"pricesDisabledHint": "Os preços precisam da vista 7d ou 14d",
"pricesError": "Não foi possível carregar os preços por noite"
```

- [ ] **Step 3: he.json** — MESMO bloco do en.json (inglês, paridade estrutural).

- [ ] **Step 4: Paridade**

Run: `node -e "const en=require('./messages/en.json'),pt=require('./messages/pt.json'),he=require('./messages/he.json');const k=o=>Object.keys(o.AdminReservations.multiCalendar).sort().join();console.log(k(en)===k(pt)&&k(en)===k(he)?'PARITY OK':'MISMATCH')"`
Expected: `PARITY OK`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/he.json
git commit -m "feat(i18n): chaves do seletor 7/14/31d e toggle de precos do calendario"
```

---

### Task 3: Refactor de alcance no `MultiCalendarView`

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Consumes: chaves i18n da Task 2 (`range7/range14/range31`).
- Produces: variáveis `rangeDays`, `rangeStart`, `rangeEnd`, `days`, `cellWidth` usadas pela Task 4; `getBarStyle` por índice de dia. A vista 31d comporta-se exatamente como hoje.

- [ ] **Step 1: Imports date-fns** — na linha 4, acrescentar `addDays` e `differenceInCalendarDays` à lista importada de `"date-fns"`.

- [ ] **Step 2: Estado do alcance** — depois de `const [currentDate, setCurrentDate] = useState(new Date());` acrescentar:

```tsx
    const [rangeDays, setRangeDays] = useState<7 | 14 | 31>(31);
```

- [ ] **Step 3: Janela genérica** — substituir o bloco (linhas ~81-89):

```tsx
    // Get days for the current month view
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());
```

por:

```tsx
    // Janela visível: 31d = mês de calendário (comportamento clássico);
    // 7d/14d = janela deslizante a partir de currentDate (estilo Guesty/Hostaway).
    const rangeStart = rangeDays === 31 ? startOfMonth(currentDate) : startOfDay(currentDate);
    const rangeEnd = rangeDays === 31 ? endOfMonth(currentDate) : startOfDay(addDays(rangeStart, rangeDays - 1));
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    // Largura de célula por alcance: vistas curtas = células largas (espaço p/ preços).
    const cellWidth = rangeDays === 7 ? 110 : rangeDays === 14 ? 76 : 48;

    // Navigation: mês na 31d, salto de rangeDays dias nas curtas.
    const nextMonth = () => setCurrentDate(rangeDays === 31 ? addMonths(currentDate, 1) : addDays(currentDate, rangeDays));
    const prevMonth = () => setCurrentDate(rangeDays === 31 ? subMonths(currentDate, 1) : addDays(currentDate, -rangeDays));
    const goToToday = () => setCurrentDate(new Date());
```

- [ ] **Step 4: Renomear usos de `monthStart`/`monthEnd`/`daysInMonth`** — no RESTO do ficheiro (filtros de reservas ~117-142, `getBarStyle` ~145-172, cabeçalho de dias ~306, células de dia ~343, barras ~348-357, blocos ~389-398): substituir TODAS as ocorrências de `monthStart`→`rangeStart`, `monthEnd`→`rangeEnd`, `daysInMonth`→`days`. (Find/replace no ficheiro; são identificadores locais, sem exports.)

- [ ] **Step 5: `getBarStyle` por índice de dia** — substituir a função inteira (após o rename do Step 4) por:

```tsx
    // Bar style calculation — por índice de dia na janela (funciona através de meses)
    const getBarStyle = (startDateStr: string, endDateStr: string) => {
        const checkIn = new Date(startDateStr);
        const checkOut = new Date(endDateStr);

        const d_checkIn = startOfDay(checkIn);
        const d_checkOut = startOfDay(checkOut);
        const d_rangeStart = startOfDay(rangeStart);
        const d_rangeEnd = startOfDay(rangeEnd);

        const effectiveStart = d_checkIn < d_rangeStart ? d_rangeStart : d_checkIn;
        const effectiveEnd = d_checkOut > d_rangeEnd ? d_rangeEnd : d_checkOut;

        const startIdx = differenceInCalendarDays(effectiveStart, d_rangeStart);
        const endIdx = differenceInCalendarDays(effectiveEnd, d_rangeStart);

        let leftPos = startIdx * cellWidth;
        if (isSameDay(effectiveStart, checkIn)) leftPos += (cellWidth / 2) + 2;

        let rightPos = (endIdx + 1) * cellWidth;
        if (isSameDay(effectiveEnd, checkOut)) {
            rightPos = endIdx * cellWidth + (cellWidth / 2) - 2;
        }

        const width = rightPos - leftPos;
        return { left: leftPos, width: Math.max(width, 10) };
    };
```

(Equivalência com o atual na vista 31d: `startDay-1 === startIdx` e `endDay === endIdx+1` dentro do mesmo mês — posições idênticas com cellWidth=48.)

- [ ] **Step 6: Largura dinâmica das células** — nas DUAS ocorrências de `w-[48px]` (cabeçalho de dias ~306 e células de linha ~343): remover `w-[48px]` da className e acrescentar `style={{ width: cellWidth }}`. Ex. cabeçalho:

```tsx
                        {days.map((day) => (
                            <div key={day.toISOString()} style={{ width: cellWidth }} className={cn("flex-shrink-0 flex flex-col items-center justify-center border-r border-admin-border dark:border-admin-dark-border/50 transition-colors", isToday(day) ? "bg-amber-50/50 dark:bg-amber-500/10" : "")}>
```

- [ ] **Step 7: Header — label da janela + seletor de alcance.**

(a) O botão do date-picker (linha ~213) mostra a janela nas vistas curtas — substituir o conteúdo `{format(currentDate, "MMMM yyyy", { locale: dateLocale })}` por:

```tsx
                            {rangeDays === 31
                                ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                : `${format(rangeStart, "d MMM", { locale: dateLocale })} – ${format(rangeEnd, "d MMM", { locale: dateLocale })}`}
```

(b) Seletor 7d/14d/31d — logo a seguir ao bloco de navegação `‹ Today ›` (div que fecha após o botão `nextMonth`, ~linha 258), acrescentar:

```tsx
                    <div className="flex items-center gap-0.5 bg-[#f5f5f5] dark:bg-admin-dark-bg p-1 rounded-lg border border-[#eeeeee] dark:border-admin-dark-border">
                        {([7, 14, 31] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRangeDays(r)}
                                className={cn(
                                    "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                                    rangeDays === r
                                        ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-white shadow-sm"
                                        : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white",
                                )}
                            >
                                {t(`range${r}`)}
                            </button>
                        ))}
                    </div>
```

- [ ] **Step 8:** Run `npx tsc --noEmit` → sem erros. Confirmar que não sobra NENHUMA ocorrência de `monthStart|monthEnd|daysInMonth|CELL_WIDTH` no ficheiro: `grep -n "monthStart\|monthEnd\|daysInMonth\|CELL_WIDTH" components/admin/reservations/MultiCalendarView.tsx` → vazio.

- [ ] **Step 9: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): seletor 7/14/31 dias com janela deslizante e celulas dinamicas"
```

---

### Task 4: Toggle "€ Preços" + camada de preços

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx` (usa `rangeDays/rangeStart/rangeEnd/days/cellWidth` da Task 3)
- Modify: `app/[locale]/admin/reservations/page.tsx` (passar prop `canShowPrices`)

**Interfaces:**
- Consumes: `getBeds24DailyPrices` (Task 1), chaves i18n `prices/pricesDisabledHint/pricesError` (Task 2).
- Produces: prop nova `canShowPrices?: boolean` em `MultiCalendarViewProps`.

- [ ] **Step 1: Prop e imports.** Em `MultiCalendarView.tsx`:

(a) Import da action e do toast e do ícone Euro (juntar aos imports existentes):

```tsx
import { getBeds24DailyPrices } from "@/app/actions/beds24";
import { toast } from "sonner";
```

E acrescentar `Euro` à lista de `lucide-react`.

(b) Na interface `MultiCalendarViewProps` acrescentar `canShowPrices?: boolean;` e no destructuring da função `canShowPrices = false`.

- [ ] **Step 2: Estado + fetch com cache por janela.** Depois do estado `rangeDays` (Task 3), acrescentar:

```tsx
    // Toggle "€ Preços" (super_admin; só vistas 7/14 — na 31d as células são estreitas demais)
    const [showPrices, setShowPrices] = useState(false);
    const [pricesByWindow, setPricesByWindow] = useState<Record<string, Record<string, Record<string, number>>>>({});
    const [pricesLoading, setPricesLoading] = useState(false);
    const windowKey = `${format(rangeStart, "yyyy-MM-dd")}|${format(rangeEnd, "yyyy-MM-dd")}`;
    const windowPrices = pricesByWindow[windowKey];

    useEffect(() => {
        if (!showPrices || !canShowPrices || rangeDays === 31 || windowPrices) return;
        let cancelled = false;
        setPricesLoading(true);
        // endDate exclusivo do getRoomCalendar → +1 dia para incluir a última noite visível
        getBeds24DailyPrices(format(rangeStart, "yyyy-MM-dd"), format(addDays(rangeEnd, 1), "yyyy-MM-dd"))
            .then((r) => {
                if (cancelled) return;
                if (r.ok) {
                    setPricesByWindow((prev) => ({ ...prev, [windowKey]: r.prices }));
                } else {
                    toast.error(t("pricesError"));
                    setShowPrices(false);
                }
            })
            .finally(() => { if (!cancelled) setPricesLoading(false); });
        return () => { cancelled = true; };
    }, [showPrices, canShowPrices, rangeDays, windowKey]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Botão "€" no header** — logo a seguir ao seletor 7/14/31 da Task 3 Step 7(b), acrescentar (renderizado só com `canShowPrices`):

```tsx
                    {canShowPrices && (
                        <button
                            onClick={() => setShowPrices((v) => !v)}
                            disabled={rangeDays === 31}
                            title={rangeDays === 31 ? t("pricesDisabledHint") : undefined}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                                rangeDays === 31
                                    ? "text-[#d4d4d4] dark:text-white/20 border-[#f5f5f5] dark:border-admin-dark-border cursor-not-allowed"
                                    : showPrices
                                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                        : "bg-white dark:bg-admin-dark-bg text-[#a3a3a3] border-[#eeeeee] dark:border-admin-dark-border hover:text-[#171717] dark:hover:text-white",
                            )}
                        >
                            <Euro className="size-3" />
                            {t("prices")}
                        </button>
                    )}
```

- [ ] **Step 4: Camada de preços nas linhas.** Dentro do render de cada linha de propriedade, DEPOIS do map das células de dia e ANTES do map das reservas (~linha 343-348 pós-Task 3), acrescentar:

```tsx
                                        {showPrices && rangeDays !== 31 && windowPrices?.[propId] && (() => {
                                            // Noites cobertas por barras (reservas + bloqueios) não mostram preço
                                            const covered = new Set<string>();
                                            const addRange = (s: string, e: string) => {
                                                const from = startOfDay(new Date(s));
                                                const to = startOfDay(new Date(e)); // checkout/end exclusivo
                                                for (let d = from; d < to; d = addDays(d, 1)) covered.add(format(d, "yyyy-MM-dd"));
                                            };
                                            reservationsByProperty[propId]?.forEach((r: any) => addRange(r.check_in, r.check_out));
                                            visibleBlockedDates?.filter((b) => b.property_id === propId).forEach((b) => addRange(b.start_date, b.end_date));
                                            return (
                                                <div className="absolute inset-x-0 bottom-1 z-[5] pointer-events-none flex">
                                                    {days.map((day) => {
                                                        const key = format(day, "yyyy-MM-dd");
                                                        const price = windowPrices[propId][key];
                                                        return (
                                                            <div key={key} style={{ width: cellWidth }} className="flex-shrink-0 text-center">
                                                                {price !== undefined && !covered.has(key) && (
                                                                    <span className={cn(
                                                                        "font-semibold text-[#a3a3a3] dark:text-white/40 tabular-nums",
                                                                        rangeDays === 7 ? "text-[11px]" : "text-[10px]",
                                                                        pricesLoading && "opacity-40",
                                                                    )}>
                                                                        €{price}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
```

- [ ] **Step 5: Passar a prop na página.** Em `app/[locale]/admin/reservations/page.tsx`, no `<MultiCalendarView ... />` (~linha 769), acrescentar:

```tsx
                    canShowPrices={role === 'super_admin'}
```

(A variável `role` já existe na página — é a mesma que gateia o switch iCal/Beds24.)

- [ ] **Step 6:** Run `npx tsc --noEmit` → sem erros.

- [ ] **Step 7: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx "app/[locale]/admin/reservations/page.tsx"
git commit -m "feat(calendar): toggle de precos por noite nas celulas livres (super_admin, vistas 7/14d)"
```

---

### Task 5: Verificação final

**Files:** nenhum novo (handoff no fim).

- [ ] **Step 1:** `npm run build` → limpo (mexemos em `app/actions/beds24.ts`, 'use server').
- [ ] **Step 2:** `npm run test:security` → sem NOVAS falhas (Test 1/3/4/5 pré-existentes conhecidas).
- [ ] **Step 3: Prova visual em localhost** (auth-gated; o que o controller conseguir sem login = rota resolve + 0 erros consola; click-through do Marcelo):
  1. 31d = comportamento idêntico ao atual (posições das barras inalteradas).
  2. 7d/14d: células largas, navegação salta 7/14 dias, header "d MMM – d MMM"; janela a cruzar fim de mês (28 jul→3 ago) com barras corretas.
  3. Toggle €: preços aparecem nas células livres das ligadas (conferir Virtudes One com o painel Beds24), somem sob as barras, ausentes nas iCal; 31d desativa o botão; erro → toast + off. Dark mode.
- [ ] **Step 4:** Atualizar `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md` (linha nova na secção de pedidos: vistas+preços feitos, por E2E) e commit:

```bash
git add -A
git commit -m "docs(handoff): vistas 7/14/31d + precos por noite no calendario (por E2E)"
```
