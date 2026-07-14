# Calendário admin: vistas 7/14/31 dias + preços por noite — design (2026-07-15)

## Objetivo

Elevar o multi-calendário admin (`/admin/reservations`, vista Calendar) ao nível dos PMS de topo
(Guesty/Hostaway/Hospitable):

1. **Seletor de alcance 7d / 14d / 31d** — janela deslizante com células mais largas nas vistas
   curtas; a vista 31d mantém o comportamento atual (mês de calendário, big picture).
2. **Toggle "€ Preços"** — preço da noite no fundo de cada célula **livre**, só nas propriedades
   ligadas ao Beds24 (única fonte de preço diário), off por defeito, desativado na vista 31d
   (anti-crowding). Mockup aprovado pelo Marcelo (2026-07-15).

Qualidade premium pixel-perfect: mesma linguagem visual do admin (rose/neutral, dark mode,
barras diagonais), preços discretos estilo Guesty.

## Decisões (respostas do Marcelo)

- Alcances **7/14/31** (não zoom contínuo, não só mês+semana).
- Preços: **toggle €, só ligadas** — desativado em 31d; sem estados vazios nas não-ligadas.
- Sem tradução he (chaves em inglês para paridade estrutural).

## Arquitetura

### 1. Refactor do alcance no `MultiCalendarView.tsx`

Hoje a grelha é estritamente mensal: `monthStart/monthEnd` + `daysInMonth`, `CELL_WIDTH = 48`
hardcoded em `getBarStyle` e `w-[48px]` nas células, e `getBarStyle` posiciona por
`getDate()` (dia-do-mês) — **parte-se numa janela que cruza meses**.

Mudanças:

- Estado novo `rangeDays: 7 | 14 | 31` (default 31 — comportamento atual preservado).
- Janela genérica: `rangeStart/rangeEnd` substituem `monthStart/monthEnd` em TODOS os usos.
  - `31` → `startOfMonth(currentDate)`..`endOfMonth(currentDate)` (igual a hoje).
  - `7`/`14` → janela deslizante: `rangeStart = startOfDay(currentDate)`,
    `rangeEnd = addDays(rangeStart, rangeDays - 1)`.
- `days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })` substitui `daysInMonth`.
- Largura de célula por alcance: `CELL_WIDTH = { 7: 110, 14: 76, 31: 48 }[rangeDays]` —
  em vez de constante. Classes `w-[48px]` passam a `style={{ width: cellWidth }}`.
- `getBarStyle` reescrito por **índice de dia**: `differenceInCalendarDays(effectiveStart,
  rangeStart) * cellWidth` (funciona através de fronteiras de mês); mantém o offset de meio-dia
  (`cellWidth/2 ± 2`) e o mínimo de 10px.
- Navegação: ←/→ saltam `rangeDays` dias nas vistas 7/14 (`addDays`) e 1 mês na vista 31
  (comportamento atual); "Hoje" volta a hoje em qualquer vista. Header mostra
  `"d MMM – d MMM"` nas vistas curtas e `"MMMM yyyy"` na 31d.
- Filtros de reservas/bloqueios por janela usam `rangeStart/rangeEnd` (a lógica atual de
  `monthStart/monthEnd` renomeada — sem mudança semântica).
- Seletor UI: pill "7d · 14d · 31d" no header do calendário (junto à navegação), mesmo estilo
  do switch iCal/Beds24 da página. Disponível a todos os admins (é só UI).

### 2. Preços por noite

**Server action** `getBeds24DailyPrices(startDate: string, endDate: string)` em
`app/actions/beds24.ts`:

- Guard existente (`super_admin` + `isBeds24Enabled`); nunca lança (union `{ok}` como as irmãs).
- Lê `beds24_properties` com `internal_property_id` preenchido (ligadas): pares
  `(internal_property_id, beds24_room_id)`.
- Para cada uma chama `getRoomCalendar(roomId, startDate, endDate)` de `lib/beds24/calendar.ts`
  (já existe, expande from/to em dias com `price`). `Promise.all` — 6 quartos ≈ 6 créditos
  (limite 100/5min, irrelevante). `endDate` exclusivo do getRoomCalendar → passar
  `addDays(rangeEnd, 1)` para incluir a última noite visível.
- Devolve `{ ok: true; prices: Record<string /*internal_property_id*/, Record<string /*YYYY-MM-DD*/, number>> }`.
  Falha por quarto → esse quarto sai do mapa (best-effort); falha total → `{ ok: false; error }`.

**Cliente (`MultiCalendarView`)**:

- Prop nova `canShowPrices?: boolean` passada pela página (`role === 'super_admin'`, o mesmo
  gate do switch Beds24). Server-side o guard protege sempre.
- Estado `showPrices` (default false) + cache `pricesByWindow` (chave `start|end`) para não
  re-buscar ao alternar o toggle na mesma janela; re-fetch ao mudar janela com toggle ligado.
- Botão "€" no header (ícone Euro + label), ativo = estilo rose (como o chip Beds24 da página);
  **disabled na vista 31d** com `title` explicativo.
- Render: camada de preços por linha de propriedade ligada — grid absoluto no fundo da célula
  (`bottom-1`, centrado, `text-[10px]`/`text-[11px]` conforme alcance, cinza `#a3a3a3`,
  `tabular-nums`). O preço de uma noite só aparece se **nenhuma barra** (reserva ou bloqueio)
  cobre essa noite — calculado por interseção com as barras já conhecidas da linha.
  Propriedades sem entrada no mapa: nada (linha limpa).
- Loading: shimmer subtil na fila de preços enquanto busca; erro → toast + toggle volta a off.

### 3. i18n

`AdminReservations.multiCalendar` ganha: `range7`, `range14`, `range31`, `prices`,
`pricesDisabledHint`, `pricesError`. en/pt reais; he = valores em inglês (paridade).

## Erros

- Action falha → toast (`pricesError`) + `showPrices=false`. Sem estados de erro persistentes.
- Quarto individual falha → omitido (best-effort, sem ruído).
- `getRoomCalendar` clampa janelas >31 noites — os alcances 7/14/31 cabem sempre.

## Fora de âmbito

Editar preços da célula (fase PMS de escrita), preços iCal (não existem), persistir preferência
de vista, drag-select de datas (referência do vídeo — outra feature), tradução he.

## Verificação (sem suite de testes)

- `npx tsc --noEmit`, `npm run build`, `npm run test:security` (falhas conhecidas pré-existentes).
- Visual em localhost: 7d/14d/31d alternam com barras bem posicionadas (incluindo janela a
  cruzar fim de mês — ex.: 28 jul → 3 ago); toggle € liga e mostra preços da Virtudes One
  conferíveis com o painel Beds24; preços somem sob as barras; 31d desativa o toggle;
  dark mode ok. Auth-gated → click-through final do Marcelo.
