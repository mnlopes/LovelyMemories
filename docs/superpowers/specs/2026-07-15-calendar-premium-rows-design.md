# Calendar Premium Rows (7/14d) — Design

**Data:** 2026-07-15
**Branch:** `feat/calendar-premium-rows`
**Antecede:** `2026-07-15-calendar-ranges-prices` (vistas 7/14/31d + toggle € já em `main` local)

## Objetivo

Elevar as vistas **7d/14d** do multi-calendário admin (`/admin/reservations`, vista Calendar) ao nível dos melhores PMS multi-propriedade (Hostaway/Guesty): linhas em **duas bandas** — barra da reserva em cima, **rail de preços por noite** em baixo — com marcador de **estadia mínima** (lua) quando houver dados. A vista **31d fica exatamente como está**.

## Âmbito e não-âmbito

- **Só 7d/14d.** A 31d não muda (mês de calendário, 72px, sem rail).
- O botão **€ Preços** continua a ser o interruptor: **ligado** → linhas em duas bandas premium; **desligado** → linhas de uma banda como hoje (72px). Mantém o gate de super_admin e a busca on-demand ao Beds24 (poupa chamadas).
- Não mexer nas barras: mesmo `getBarStyle` + `getBarClipPath` (paralelogramo diagonal que apanha check-in/check-out), mesmo conteúdo (nome + €valor da estadia + selo do canal). Só mudam de sítio (banda de cima) e de centragem vertical.
- Sem nova migração. Sem push.

## Decisões de design

### Estrutura da linha (quando `showPrices` ligado e `rangeDays !== 31`)

Linha passa de 72px para **~92px**, dividida em duas bandas dentro da área de dias:

```
┌─ sidebar (240/80px, inalterada) ─┬─ área de dias ───────────────────────┐
│                                  │  BANDA DA BARRA  (~62px)              │
│  Virtudes One / PORTO            │   células (fundo/fim-de-semana/hoje)  │
│                                  │   + barras (absolute, clip diagonal)  │
│                                  │   + blocos                            │
│                                  ├───────────────────────────────────────┤
│                                  │  RAIL DE PREÇOS  (~28px)              │
│                                  │   [lua N]  €preço   (por noite)       │
└──────────────────────────────────┴───────────────────────────────────────┘
```

- Quando `showPrices` **desligado** OU `rangeDays === 31`: linha de **uma banda, 72px**, render atual sem rail (comportamento de hoje).
- Alturas: banda da barra `62px`, rail `28px`. Constantes derivadas de `rangeDays`/`showPrices` para não afetar a 31d.

### Banda da barra

- Idêntica ao render atual das barras/blocos, mas centrada verticalmente **na banda de cima** (não na linha toda). A linha vermelha de "hoje" e o sombreado de fim-de-semana ocupam a **linha toda** (barra + rail) para leitura de coluna contínua.
- Barras: sem qualquer alteração de estilo/conteúdo.

### Rail de preços

- Uma célula por noite (`width: cellWidth`, alinhada com o cabeçalho), preço **a negrito, centrado**, tabular-nums. Fundo subtil (`--surface-1`/faixa) para distinguir da banda da barra.
- **Lua de estadia mínima:** ícone pequeno + número no canto superior-esquerdo da célula do rail, **só quando `minStay > 1`**. Sem dados de minStay → sem lua.
- **Propriedades não-ligadas** (Airbnb/iCal, sem dados Beds24): rail **vazio** (sem "—", só espaço) — evita ruído dado que hoje só 6 das ~N propriedades têm preços.
- O preço aparece em **todas** as noites com dado (incluindo as cobertas por barra — a barra fica por cima na banda de cima; já não há colisão, por isso deixa de fazer sentido esconder o preço sob a barra). Isto **substitui** a lógica atual de `covered`/esconder preço nas noites com reserva.

### Larguras de célula (mais espaço no 7/14d)

- 7d: `120px` (era 110). 14d: `88px` (era 76). 31d: `48px` (inalterado).

### Ação de dados — estender `getBeds24DailyPrices` para incluir `minStay`

O `getRoomCalendar` já devolve `minStay` por noite. Estender o shape:

```ts
export type Beds24DayInfo = { price: number | null; minStay: number | null };
export type Beds24DailyPricesResult =
    | { ok: true; prices: Record<string, Record<string, Beds24DayInfo>> }
    | { ok: false; error: string };
```

- Para cada noite, incluir a entrada se `price` **ou** `minStay` existir. O cliente lê `windowPrices[propId][date]?.price` e `.minStay`.
- Consumidor único (`MultiCalendarView`) é atualizado no mesmo passo — é uma mudança contida na branch.
- `app/actions/beds24.ts` é `'use server'`: só exportar funções async e **types**; correr `npm run build` (não só tsc) depois de mexer.

## Componentes / ficheiros afetados

- `app/actions/beds24.ts` — estender `getBeds24DailyPrices` (novo type `Beds24DayInfo`, incluir minStay).
- `components/admin/reservations/MultiCalendarView.tsx` — refactor da linha de propriedade para duas bandas condicionais; rail de preços com lua; usar novo shape; larguras 120/88; remover a lógica de esconder preço sob a barra.
- `messages/{en,pt,he}.json` — (opcional) `aria-label`/tooltip de estadia mínima em `AdminReservations.multiCalendar` (ex. `minStayNights: "Min. {count} nights"`), paridade nas 3 línguas.

## Interfaces (isolamento)

- **`getBeds24DailyPrices(start, end)`** → `{ok, prices: Record<propId, Record<date, {price, minStay}>>}`. Service-role, best-effort, nunca lança. Depende de `beds24_properties` + `getRoomCalendar`.
- **Rail (sub-render puro no componente)** — dado `propId` + `windowPrices` + `days` + `cellWidth`, produz a banda. Sem estado próprio; depende só das props/estado já existentes.
- **Bar band** — reutiliza `getBarStyle`/`getBarClipPath` sem alteração.

## Erros / casos-limite

- Sem dados para a propriedade → rail vazio (não quebra layout).
- Erro na action → toast + toggle volta a off (comportamento atual mantido).
- `minStay` ausente → sem lua.
- 31d ou toggle off → nunca renderiza rail; altura 72px; zero regressão.

## Verificação

- `npx tsc --noEmit` + `npm run build` (mexe em ficheiro 'use server') limpos.
- `npm run test:security` sem novas falhas (Test 1/3/4/5 pré-existentes conhecidas).
- Prova visual (auth-gated, click-through do Marcelo): 7/14d com toggle on → duas bandas, preço centrado por noite, lua onde minStay>1 (Virtudes One), rail vazio nas iCal; barras diagonais inalteradas com €valor; toggle off → volta a 72px uma banda; 31d intacta; dark mode.

## YAGNI / adiado

- Sem vista mês-por-propriedade (Hospitable) — fica para spec própria se pedida.
- Sem edição de preços/estadia-mínima inline (só leitura).
- Sem "—" nem placeholder nas não-ligadas.
