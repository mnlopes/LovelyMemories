# Calendar Premium Rows (7/14d) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vistas 7d/14d do multi-calendário admin em linhas de duas bandas (barra em cima, rail de preços por noite em baixo com lua de estadia mínima), controladas pelo toggle €; a 31d fica intacta.

**Architecture:** Refactor da linha de propriedade no `MultiCalendarView` para render condicional em duas bandas quando o rail de preços está ativo. As barras/blocos mantêm-se (mesmo `getBarStyle`/`getBarClipPath`), só recentradas na banda de cima via `top` inline. Novo rail é um sub-render puro por-linha. A action `getBeds24DailyPrices` passa a devolver também `minStay`.

**Tech Stack:** Next.js 16, server actions, `lib/beds24/calendar.ts` (`getRoomCalendar` já devolve `minStay`), date-fns, Tailwind, lucide-react (`Moon`), next-intl.

## Global Constraints

- **Só 7d/14d mudam.** A 31d preserva EXATAMENTE o atual (mês, 72px, sem rail, células 48px).
- Toggle **€ Preços** (super_admin, `canShowPrices`) é o interruptor: ligado → duas bandas; desligado → uma banda 72px (atual).
- Barras/blocos: SEM alteração de estilo/conteúdo (paralelogramo diagonal + nome + €valor + selo). Só muda a centragem vertical (banda de cima) via `top` inline.
- `app/actions/beds24.ts` é `'use server'`: só exportar funções async e types; nunca `const`. Correr `npm run build` (não só tsc) depois de mexer.
- Actions nunca lançam — discriminated union `{ok:true,…}|{ok:false,error}`.
- i18n en+pt reais; he = valores em inglês (paridade estrutural obrigatória next-intl).
- Sem suite de testes: verificação = `npx tsc --noEmit` + `npm run build` + `npm run test:security` (falhas Test 1/3/4/5 pré-existentes conhecidas) + prova visual.
- Não fazer push para origin.
- Alturas fixas: `rowHeight` 90 (duas bandas) / 72 (uma banda); `barBandH` 62; `railH` 28; centro da barra `barBandH/2` = 31. Larguras: 7d=120, 14d=88, 31d=48.

---

### Task 1: Action `getBeds24DailyPrices` devolve `minStay`

**Files:**
- Modify: `app/actions/beds24.ts:464-502`

**Interfaces:**
- Consumes: `getRoomCalendar` (existente; `CalendarDay` tem `{date, price: number|null, available, minStay: number|null}`).
- Produces: `Beds24DayInfo = { price: number | null; minStay: number | null }`; `getBeds24DailyPrices(start, end): Promise<{ok:true; prices: Record<string, Record<string, Beds24DayInfo>>} | {ok:false; error:string}>`. Consumido pela Task 3.

- [ ] **Step 1: Substituir o bloco inteiro** (linhas 464-502) por:

```ts
// ---------- Preços por noite (toggle € do multi-calendário admin) ----------

export type Beds24DayInfo = { price: number | null; minStay: number | null };

export type Beds24DailyPricesResult =
    | { ok: true; prices: Record<string, Record<string, Beds24DayInfo>> }
    | { ok: false; error: string };

/**
 * Preço da noite (price1) + estadia mínima (minStay) das propriedades LIGADAS,
 * para o rail "€" do calendário. `endDate` é EXCLUSIVO (semântica do getRoomCalendar)
 * — o cliente passa rangeEnd+1. Best-effort por quarto: um quarto que falhe sai do
 * mapa sem derrubar o resto. Nunca lança.
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
        const prices: Record<string, Record<string, Beds24DayInfo>> = {};
        await Promise.all((props ?? []).map(async (p) => {
            try {
                const days = await getRoomCalendar(Number(p.beds24_room_id), startDate, endDate);
                const map: Record<string, Beds24DayInfo> = {};
                for (const d of days) {
                    if (typeof d.price === 'number' || typeof d.minStay === 'number') {
                        map[d.date] = { price: d.price, minStay: d.minStay };
                    }
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

- [ ] **Step 2:** Run `npx tsc --noEmit` → sem erros (o consumidor ainda usa o shape antigo → ERRO ESPERADO em `MultiCalendarView.tsx` sobre `windowPrices[propId][key]` ser objeto e não number; será corrigido na Task 3). Se o único erro for esse, avançar.

- [ ] **Step 3: Commit**

```bash
git add app/actions/beds24.ts
git commit -m "feat(beds24): getBeds24DailyPrices devolve tambem minStay (rail do calendario)"
```

---

### Task 2: Chave i18n `minStayNights`

**Files:**
- Modify: `messages/en.json`, `messages/pt.json`, `messages/he.json` — dentro de `AdminReservations.multiCalendar`.

**Interfaces:**
- Produces: chave `minStayNights` (tooltip/aria da lua), consumida na Task 3.

- [ ] **Step 1: en.json** — dentro de `"multiCalendar"`, a seguir a `"pricesError": ...`, acrescentar:

```json
"minStayNights": "Min. {count} nights",
```

- [ ] **Step 2: pt.json** — idem:

```json
"minStayNights": "Mín. {count} noites",
```

- [ ] **Step 3: he.json** — MESMA linha do en.json (inglês, paridade estrutural).

- [ ] **Step 4: Paridade**

Run: `node -e "const en=require('./messages/en.json'),pt=require('./messages/pt.json'),he=require('./messages/he.json');const k=o=>Object.keys(o.AdminReservations.multiCalendar).sort().join();console.log(k(en)===k(pt)&&k(en)===k(he)?'PARITY OK':'MISMATCH')"`
Expected: `PARITY OK`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/he.json
git commit -m "feat(i18n): chave minStayNights do rail de precos do calendario"
```

---

### Task 3: Linhas de duas bandas + rail de preços no `MultiCalendarView`

**Files:**
- Modify: `components/admin/reservations/MultiCalendarView.tsx`

**Interfaces:**
- Consumes: `getBeds24DailyPrices` + `Beds24DayInfo` (Task 1); `minStayNights` (Task 2); variáveis `rangeDays/rangeStart/rangeEnd/days/cellWidth/showPrices/canShowPrices/windowPrices/pricesLoading` (já existentes).
- Produces: nenhuma nova exportação.

- [ ] **Step 1: Import do `Moon` (lucide) e do type `Beds24DayInfo`.**

Na linha de import do lucide-react, acrescentar `Moon`:
```tsx
import { ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Info, Check, Filter, ChevronDown, Ban, MapPin, Users, Bed, Bath, X, Globe, Euro, Moon } from "lucide-react";
```

Na linha de import da action, acrescentar o type:
```tsx
import { getBeds24DailyPrices, type Beds24DayInfo } from "@/app/actions/beds24";
```

- [ ] **Step 2: Tipar o estado com o novo shape.** Substituir:

```tsx
    const [pricesByWindow, setPricesByWindow] = useState<Record<string, Record<string, Record<string, number>>>>({});
```

por:

```tsx
    const [pricesByWindow, setPricesByWindow] = useState<Record<string, Record<string, Record<string, Beds24DayInfo>>>>({});
```

- [ ] **Step 3: Larguras maiores + constantes das bandas.** Substituir a linha do `cellWidth`:

```tsx
    // Largura de célula por alcance: vistas curtas = células largas (espaço p/ preços).
    const cellWidth = rangeDays === 7 ? 110 : rangeDays === 14 ? 76 : 48;
```

por:

```tsx
    // Largura de célula por alcance: vistas curtas = células largas (espaço p/ preços).
    const cellWidth = rangeDays === 7 ? 120 : rangeDays === 14 ? 88 : 48;

    // Linha em duas bandas quando o rail de preços está ativo (só 7/14d).
    const twoBand = showPrices && rangeDays !== 31;
    const rowHeight = twoBand ? 90 : 72;
    const barBandH = twoBand ? 62 : rowHeight;
    const railH = 28;
    const barCenter = barBandH / 2;
```

Nota: `showPrices` é declarado mais abaixo (bloco do toggle). Mover estas 6 linhas (do `twoBand` ao `barCenter`) para LOGO A SEGUIR ao bloco do `useEffect` dos preços (onde `showPrices`/`pricesLoading` já existem), mantendo só a linha do `cellWidth` aqui.

- [ ] **Step 4: Altura dinâmica da linha.** Substituir:

```tsx
                                <div key={propId} className="flex h-[72px] hover:bg-[#fafafa]/50 dark:hover:bg-white/5 transition-colors group">
```

por:

```tsx
                                <div key={propId} style={{ height: rowHeight }} className="flex hover:bg-[#fafafa]/50 dark:hover:bg-white/5 transition-colors group">
```

- [ ] **Step 5: Substituir a camada de preços atual pelo rail de duas bandas.** Substituir todo o bloco (linhas ~416-447, de `{showPrices && rangeDays !== 31 && windowPrices?.[propId] && (() => {` até ao `})()}` que o fecha) por:

```tsx
                                        {twoBand && (
                                            <div
                                                className="absolute inset-x-0 flex border-t border-admin-border dark:border-admin-dark-border/50 bg-[#fafafa]/70 dark:bg-white/[0.02] z-[5] pointer-events-none"
                                                style={{ top: barBandH, height: railH }}
                                            >
                                                {days.map((day) => {
                                                    const key = format(day, "yyyy-MM-dd");
                                                    const info: Beds24DayInfo | undefined = windowPrices?.[propId]?.[key];
                                                    return (
                                                        <div key={key} style={{ width: cellWidth }} className="flex-shrink-0 relative flex items-center justify-center border-r border-admin-border dark:border-admin-dark-border/40">
                                                            {info?.minStay != null && info.minStay > 1 && (
                                                                <span
                                                                    title={t("minStayNights", { count: info.minStay })}
                                                                    className="absolute left-1 top-0.5 flex items-center gap-0.5 text-[8px] font-bold text-[#c4c4c4] dark:text-white/30"
                                                                >
                                                                    <Moon className="size-2.5" />{info.minStay}
                                                                </span>
                                                            )}
                                                            {typeof info?.price === "number" && (
                                                                <span className={cn(
                                                                    "font-bold tabular-nums text-[#525252] dark:text-white/70",
                                                                    rangeDays === 7 ? "text-xs" : "text-[11px]",
                                                                    pricesLoading && "opacity-40",
                                                                )}>
                                                                    €{info.price}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
```

(Isto remove a lógica `covered`/esconder-preço-sob-a-barra: agora o preço aparece em todas as noites com dado, como na referência Hostaway; a barra fica por cima na banda de cima.)

- [ ] **Step 6: Recentrar as BARRAS na banda de cima.** Na `<div>` de cada reserva (bloco `reservationsByProperty[propId]?.map`), remover `top-1/2 -translate-y-1/2` da className e acrescentar `top`+`transform` ao style. Substituir:

```tsx
                                                    className={cn(
                                                        "absolute top-1/2 -translate-y-1/2 h-8 flex items-center px-3 z-10 transition-all",
                                                        isBeds24
                                                            ? "bg-rose-500 text-white cursor-pointer hover:brightness-105 animate-in fade-in duration-300"
                                                            : cn("cursor-pointer hover:brightness-110", getStatusColor(effectiveStatus)),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, clipPath: getBarClipPath(startsBefore, endsAfter) }}
```

por:

```tsx
                                                    className={cn(
                                                        "absolute h-8 flex items-center px-3 z-10 transition-all",
                                                        isBeds24
                                                            ? "bg-rose-500 text-white cursor-pointer hover:brightness-105 animate-in fade-in duration-300"
                                                            : cn("cursor-pointer hover:brightness-110", getStatusColor(effectiveStatus)),
                                                    )}
                                                    style={{ left: `${style.left}px`, width: `${style.width}px`, top: barCenter, transform: "translateY(-50%)", clipPath: getBarClipPath(startsBefore, endsAfter) }}
```

- [ ] **Step 7: Recentrar os BLOCOS na banda de cima.** Na `<div>` de cada bloqueio (bloco `visibleBlockedDates...map`), remover `top-1/2 -translate-y-1/2` da className e acrescentar `top`+`transform` ao style. Substituir:

```tsx
                                                    className={cn(
                                                        "absolute top-1/2 -translate-y-1/2 h-9 flex items-center px-3 z-0 transition-all",
                                                    )}
                                                    style={{
                                                        left: `${style.left}px`,
                                                        width: `${style.width}px`,
                                                        clipPath: getBarClipPath(startsBefore, endsAfter),
```

por:

```tsx
                                                    className={cn(
                                                        "absolute h-9 flex items-center px-3 z-0 transition-all",
                                                    )}
                                                    style={{
                                                        left: `${style.left}px`,
                                                        width: `${style.width}px`,
                                                        top: barCenter,
                                                        transform: "translateY(-50%)",
                                                        clipPath: getBarClipPath(startsBefore, endsAfter),
```

- [ ] **Step 8:** Run `npx tsc --noEmit` → sem erros.

- [ ] **Step 9: Commit**

```bash
git add components/admin/reservations/MultiCalendarView.tsx
git commit -m "feat(calendar): linhas premium 7/14d em duas bandas com rail de precos + lua de estadia minima"
```

---

### Task 4: Verificação final + handoff

**Files:** `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md`

- [ ] **Step 1:** `npm run build` → limpo (mexemos em `app/actions/beds24.ts`, 'use server').
- [ ] **Step 2:** `npm run test:security` → sem NOVAS falhas (Test 1/3/4/5 pré-existentes).
- [ ] **Step 3: Prova visual em localhost** (auth-gated; o controller confirma que a rota resolve + 0 erros de consola; click-through do Marcelo):
  1. 31d = idêntica ao atual (72px, sem rail, células 48px).
  2. 7/14d + toggle € ligado: linhas altas em duas bandas; rail com preço centrado por noite; lua+nº onde `minStay>1` (Virtudes One); rail vazio nas iCal; barras diagonais inalteradas com €valor da estadia; preço visível também nas noites sob barra.
  3. Toggle € desligado no 7/14d → volta a 72px, uma banda (como hoje).
  4. Dark mode; janela a cruzar fim de mês.
- [ ] **Step 4:** Atualizar `docs/superpowers/specs/2026-07-13-beds24-STATUS-HANDOFF.md` (linha nova na secção "Pedidos do Marcelo": linhas premium 7/14d feitas, por E2E) e commit:

```bash
git add -A
git commit -m "docs(handoff): linhas premium 7/14d do calendario (por E2E)"
```
