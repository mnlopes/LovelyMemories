# Beds24 booking detail sheet — design (2026-07-14)

## Objetivo

Ao clicar numa barra Beds24 no calendário admin (`/admin/reservations`, vista Calendar, preview
Beds24 ligado), abre um painel lateral direito **read-only** com a ficha rica da reserva —
qualidade visual ao nível dos PMS de topo (Hospitable/Guesty/Hostaway: painel lateral, identidade
do hóspede no topo, estadia como timeline, breakdown financeiro, meta discreta no fundo).

Mockup aprovado pelo Marcelo (2026-07-14): header com avatar/iniciais + chip canal + pill status +
selo Beds24 → cartão estadia (check-in/out com dia da semana, nº noites, propriedade, hóspedes) →
cartão financeiro (breakdown + payout líquido em destaque) → contacto clicável → meta em rodapé.

## Decisões (respostas do Marcelo)

- **Read-only.** Sem ações que mudem estado; sem atalho ao inbox. Mantém o isolamento do preview.
- **Fetch ao clicar.** A lista do calendário continua magra; PII (email/telefone) só sai do
  servidor quando se abre uma reserva concreta.
- **i18n só en + pt.** Sem hebraico (alinha com o gap pré-existente do namespace AdminReservations).

## Arquitetura

### 1. Server action — `getBeds24BookingDetail(beds24BookingId: number)`

Em `app/actions/beds24.ts`, junto do `getBeds24CalendarPreview`:

- Guard existente (`super_admin` + `isBeds24Enabled`).
- Uma linha de `beds24_bookings` por `beds24_booking_id` (service-role; RLS das beds24_* intocada).
- Resolve o título da propriedade do site via `beds24_properties.internal_property_id` → `properties`.
- Nunca lança: `{ ok: true, booking: Beds24BookingDetail } | { ok: false, error: string }`.

Shape `Beds24BookingDetail` (tudo derivado no servidor):

- Identidade: `guest_name`, iniciais derivadas, `channel`, `status`, `sub_status`.
- Estadia: `arrival`, `departure`, `nights` (derivado), `num_adult`, `num_child`, `property_title`.
- Financeiro: `price`, `commission`, `net_payout` (price − commission), `invoice_items`
  (do `raw.invoiceItems` quando existir: `{ description, amount, type }[]` — best-effort,
  campos desconhecidos ignorados).
- Contacto: `guest_email`, `guest_phone` (podem ser null — Airbnb mascara às vezes).
- Meta: `beds24_booking_id`, `api_reference` (ref. Airbnb), `booking_time`, `modified_time`,
  `first_seen_via`, `channel` raw.

### 2. Componente — `components/admin/reservations/Beds24BookingDetailSheet.tsx`

Novo client component, slide-over à direita a condizer com o `ReservationDetailSheet` existente
(framer-motion `AnimatePresence`, overlay escuro clicável para fechar, dark mode, paleta
rose/neutral do admin). **Sem botões de ação.**

- Props: `{ beds24BookingId: number | null; onClose: () => void }`.
- Ao abrir: skeleton shimmer → fetch via action → renderiza. Erro → toast (sonner) + fecha.
- Secções (ordem do mockup aprovado):
  1. **Header** — avatar circular (iniciais sobre rose-100), nome, chip canal (ícone + nome),
     pill status (confirmed=emerald, new=amber, resto=neutral), selo "BEDS24" discreto, botão X.
  2. **Estadia** — CHECK-IN | seta + "N noites" | CHECK-OUT (dia da semana + data,
     `date-fns` com locale); linha inferior: propriedade + "N adultos · N crianças".
  3. **Financeiro** — linhas do breakdown (`invoice_items` quando existirem; senão total +
     comissão), comissão a vermelho suave, **Payout líquido** destacado; números tabulares.
  4. **Contacto** — email/telefone como `mailto:`/`tel:`; ausentes → estado vazio elegante
     ("Contacto gerido pelo Airbnb").
  5. **Meta** — booking #id e ref. Airbnb em mono, "Reservada em", "Última alteração",
     origem (webhook/import). Texto pequeno, cinza.

### 3. Ligação no `MultiCalendarView.tsx`

- `Beds24CalendarBooking` (em `app/actions/beds24.ts`) ganha `beds24_booking_id: number`
  (sem PII adicional no payload magro).
- Novo estado `selectedBeds24Id: number | null`.
- Barra Beds24 (linha ~369): `cursor-pointer` (substitui `cursor-default`), hover com leve
  brilho já existente, `onClick` → `setSelectedBeds24Id(res.beds24_booking_id)`.
- `<Beds24BookingDetailSheet>` renderizado junto ao `ReservationDetailSheet`.

### 4. i18n

Novo bloco `AdminReservations.beds24Detail` em `messages/en.json` e `messages/pt.json`
(labels das secções, status, estados vazios, erro). **`he.json` recebe as mesmas chaves em
inglês** para manter a paridade estrutural exigida pelo next-intl, sem tradução.

## Fluxo

clicar barra → set id → sheet monta com skeleton → action → render · overlay/X → limpa id.

## Erros

- Action falha (rede, guard, booking desaparecido) → `{ ok: false }` → toast com a mensagem +
  sheet fecha. Sem estados de erro persistentes dentro do sheet.
- `raw.invoiceItems` ausente/forma inesperada → cai para total + comissão (nunca rebenta).

## Verificação (sem suite de testes)

- `npx tsc --noEmit`, `npm run build`, `npm run test:security`.
- Prova visual em localhost:3001: preview Beds24 ligado → clicar "Emilia Neukranz €806.5"
  (Virtudes One) → ficha abre com dados reais; testar dark mode e um booking sem invoiceItems.

## Fora de âmbito

Ações PMS (mensagens, cancelar, notas), atalho ao inbox, tradução he, push para prod
(main local continua à frente de origin — decisão de push é do Marcelo).
