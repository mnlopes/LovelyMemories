# Preview Beds24 no calendário de reservas — Design

**Data:** 2026-07-14 · **Estado:** aprovado pelo Marcelo · **Âmbito:** admin `/admin/reservations` (vista Calendar)

## Objetivo

O calendário admin é hoje alimentado por iCal (`blocked_dates`, barras rosa "Airbnb" anónimas) +
reservas diretas do site (`reservations`). O Beds24 já recebe as reservas reais das propriedades
ligadas, com nome do hóspede, preço, canal e estado. Este preview é a **lente de transição**:
um switch que mostra, nas propriedades ligadas, como o calendário fica alimentado pelo Beds24 —
sem tocar na produção (o iCal continua a mandar no site até ao cutover).

## Decisões (com o Marcelo, 2026-07-14)

1. **Toggle global de preview** — um único switch na vista de calendário; não persiste
   (estado local, desligado por defeito). O cutover real é decisão futura.
2. **Só troca as barras Airbnb** — nas propriedades ligadas, as `blocked_dates` de
   `source='airbnb_booking'` (iCal) são escondidas e substituídas pelas `beds24_bookings`.
   Reservas diretas do site e bloqueios manuais do owner mantêm-se como estão.
3. **Visual: estilo Airbnb + dados ricos** — as barras Beds24 mantêm a linguagem rosa/Airbnb,
   mas mostram nome do hóspede e preço (como as diretas) + selo pequeno "Beds24".
   **Requisito explícito: qualidade premium, moderna, pixel-perfect** — ao nível do resto
   do backoffice (transições suaves, dark mode impecável, microdetalhes).
5. **Barras diagonais à Hospitable em TODO o calendário (2026-07-14, mockup aprovado)** —
   todas as barras (diretas, Beds24, iCal, bloqueios de owner) passam a paralelogramo:
   começam ao meio-dia da célula de check-in e acabam ao meio-dia da de check-out, com
   arestas diagonais (~9px de inclinação; `clip-path: polygon`). Semântica: o dia de
   turnover fica visivelmente partilhado entre check-out e check-in. Aplica-se sempre,
   com o preview ligado ou desligado — um único sistema visual, sem mistura de estilos.
   Detalhes premium: transição suave ao alternar a fonte (fade, não flash), hover com
   tooltip (datas/noites), dark mode com os mesmos tons.
4. **Abordagem A: server action** — `beds24_bookings` tem RLS service-role only (dados
   pessoais); não se abre policy. O preview lê via action com `getSupabaseAdmin()`,
   como o resto de `app/actions/beds24.ts`. Zero migrações.

## Arquitetura

### Server action — `getBeds24CalendarPreview()` (em `app/actions/beds24.ts`)

- Guard: **super_admin only** (mesmo guard das restantes actions beds24).
- Query 1: `beds24_properties` com `internal_property_id not null` → mapa
  `beds24_property_id → internal_property_id`.
- Query 2: `beds24_bookings` dessas propriedades com `status in ('confirmed','new')`
  (exclui `cancelled`, inquiries/requests) e `departure >= hoje - 60 dias` (o calendário
  não precisa de histórico profundo; evita puxar tudo).
- Devolve:
  ```ts
  interface Beds24CalendarPreview {
      internalPropertyIds: string[];            // propriedades cobertas pelo preview
      bookings: Beds24CalendarBooking[];
  }
  interface Beds24CalendarBooking {
      id: string;               // `b24-${beds24_booking_id}` (nunca colide com uuid)
      property_id: string;      // internal_property_id
      guest_name: string;       // first + last (fallback 'Airbnb guest')
      check_in: string;         // arrival (date ISO)
      check_out: string;        // departure
      total_price: number | null;
      channel: string | null;   // 'airbnb' | 'direct' | …
      status: string;           // beds24 status
      is_airbnb: boolean;       // channel === 'airbnb' (pinta o estilo)
      is_beds24: true;          // marca a fonte (selo + read-only)
  }
  ```
- Erro → `{ ok: false, error }`; nunca lança para o cliente.

### Página `/admin/reservations` (client)

- Novo estado `beds24Preview: boolean` + `previewData: Beds24CalendarPreview | null`.
- O switch só é renderizado quando `role === 'super_admin'` **e** `view === 'calendar'`.
- Ao ligar: chama a action (com estado de loading no próprio switch); ao desligar: limpa.
- Composição dos dados passados ao `MultiCalendarView` quando ligado:
  - `blockedDates` filtradas: remove as com `source==='airbnb_booking'` cujo
    `property_id ∈ internalPropertyIds`;
  - o mesmo filtro aplica-se às pseudo-reservas `block-*` derivadas (a página junta
    blocked_dates à lista de reservations — o filtro tem de apanhar os dois sítios);
  - `reservations` = diretas do site + `previewData.bookings` (as barras Beds24).
- Falha da action → toast de erro + switch volta a OFF (nunca calendário vazio).

### `MultiCalendarView`

- Barras com `is_beds24`: estilo base Airbnb (rosa) mas com o layout de conteúdo das
  reservas diretas (nome do hóspede + preço) + selo "Beds24" discreto.
- Read-only: sem menu de ações (geridas no Beds24). Clique numa barra Beds24 não abre
  o ReservationDetailSheet — os dados essenciais (nome, preço) já estão visíveis na barra
  e no tooltip nativo (`title`). Sem novas features de edição.
- Legenda do calendário ganha a entrada "Beds24" quando o preview está ligado.

### O que NÃO muda

- Nada em produção/site público; iCal continua a alimentar `blocked_dates`.
- Vista List não é tocada (preview é só do calendário).
- Sem migrações; sem policies novas; sem estado persistido.

## i18n

Novas chaves `AdminReservations` em paridade en/pt/he: label do switch
(ex.: "Fonte de dados"), "iCal", "Beds24", selo "Beds24", toast de erro do preview,
entrada de legenda.

## Testes / verificação

- `npx tsc --noEmit` + `npm run build` limpos.
- Dev server: ligar o switch como super_admin → Virtudes One (7 reservas reais no Beds24)
  mostra barras com nome+preço no lugar das barras iCal anónimas; The Root/Virtudes Two idem;
  propriedades não ligadas inalteradas; bloqueios manuais do owner continuam visíveis.
- Desligar → calendário volta exatamente ao estado atual.
- Como admin normal, o switch não aparece.
