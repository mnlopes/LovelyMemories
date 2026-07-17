# Opportunities (gap-nights) — design

**Data:** 2026-07-17
**Estado:** aprovado por mockup (Marcelo), a implementar.

## Objetivo

Analisar o calendário de **todas as casas** nos **próximos 60 dias** e identificar
**noites órfãs** — sequências curtas de noites livres presas entre duas reservas, que
quase nunca se vendem sozinhas. Fase de **identificação** apenas (detetar + mostrar).
A ação (ajustar min-stay no Beds24 à Lodgify) fica para a fase 2.

## Definição de "gap" (oportunidade)

Para cada casa, a **ocupação** = união dos intervalos de `reservations` (diretas,
confirmed/checked-in) + `blocked_dates` (blocos Airbnb via iCal). É a mesma ocupação
que o calendário desenha na vista iCal (default).

Um **gap** é:
- uma sequência de noites livres com ocupação **imediatamente antes E depois** (órfã);
- **noites do gap** = `próximo check-in − check-out anterior` (dias);
- oportunidade se **1 ≤ noites ≤ 3** (limite `MAX_GAP_NIGHTS`, afinável);
- com `gapStart ≥ hoje` e dentro da janela de 60 dias.
- Turnover no mesmo dia (checkout = próximo checkin) → 0 noites → não é gap.

## Arquitetura

### `lib/opportunities.ts` (motor puro, testável)
```ts
type Interval = { start: string; end: string }; // ISO date (check-in, check-out)
type Gap = { propertyId: string; gapStart: string; gapEnd: string; nights: number };

function findGaps(
  occupancyByProperty: Record<string, Interval[]>,
  opts: { fromISO: string; toISO: string; maxGapNights: number },
): Gap[];
```
Sem I/O. Por casa: ordena + funde intervalos, percorre pares consecutivos, emite os
que cumprem a definição. Ordena o resultado por `gapStart` (mais urgente primeiro).
Testado em `scripts/test-opportunities.ts` (`npx tsx`).

### `app/actions/opportunities.ts`
`getOpportunities()`: `guardRead` (super_admin + admin). Janela hoje..hoje+60.
Lê reservations + blocked_dates (reutiliza os padrões do `getOverviewData`), constrói
`occupancyByProperty`, chama `findGaps`, enriquece cada gap com nome/cidade/foto da casa.
Devolve `{ opportunities: OpportunityCard[], windowFrom, windowTo }`.
Nunca lança (contrato como o overview) — em erro devolve lista vazia.

`OpportunityCard = { propertyId, propertyTitle, city, image, gapStart, gapEnd, nights }`.

### UI — modo Opportunities no Overview
- **Switch:** tile "N gaps" na fila dos stats do header (`app/[locale]/admin/page.tsx`),
  com ponto de alerta dourado. Alterna `oppMode` (estado local). Segunda vez / ✕ volta.
  Subtítulo "modo Opportunities" ao lado da data.
- Quando `oppMode` ligado, o miolo (chegadas/partidas + property status + rails) é
  substituído por `<OpportunitiesView>`; o **rail Co-Host mantém-se** à direita.
- **`components/admin/opportunities/OpportunitiesView.tsx`**:
  - cartões horizontais de oportunidades por urgência (casa, datas, noites, "em X dias");
    selecionar filtra o calendário.
  - `<OpportunitiesCalendar>` por baixo: timeline própria (não reutiliza MultiCalendarView),
    janela de 60 dias com navegação, linhas por casa, barras de ocupação (reservas +
    Airbnb), **gaps realçados**. Filtrado pela oportunidade selecionada (chip "Casa ✕");
    remover o chip → mostra **todas** as casas com gaps.
  - **Realce do gap compatível com preço:** a célula da noite órfã ganha fundo dourado
    (`#c5a059`/tint) + borda dourada no topo + bandeirinha no canto; o preço € (casas
    Beds24, quando visível) continua a renderizar por baixo. Sem quadrado cheio.

## Cobertura e fiabilidade
Todas as casas. Onde o iCal está partido/desatualizado, o gap herda essa incerteza —
mas isso já é visível no próprio calendário (mesma fonte de ocupação). Sem flag de
incerteza nesta fase.

## Fora de âmbito (fase 2)
- Ação "tornar reservável" (ajustar min-stay via Beds24).
- Enriquecimento min-stay ("min-stay 3 · gap 1 → não reservável").
- Sugestões proativas do agente Co-Host a partir dos gaps.

## Decisões fechadas
60 dias · noites órfãs 1–3 · todas as casas · switch no Overview com rail Co-Host
presente · cartões por urgência + calendário filtrável (filtro opcional) · realce
dourado compatível com preço · min-stay adiado.
