# Reservation-aware guest agent — design

**Date:** 2026-07-17
**Status:** approved (Marcelo, via brainstorm) — NÃO executado; handoff para outro agente
**Base:** o data-grounded agent JÁ existe (spec `2026-07-14-scalable-guest-agent-design.md`): `lib/ai-decision.ts` `decide()` → `runAgent` (`lib/ai-agent.ts`) com ferramentas `getKnowledge`+`getCalendar` (`lib/ai-agent-tools.ts`), gate de citações (`covered`). Reserva e propriedade já entram no prompt (`lib/ai-messaging.ts` `buildSystemPrompt`).

## Problema (diagnosticado ao vivo 2026-07-17)

Hóspede Loïc (Casa Serena Gaia, reserva CONFIRMADA 19→23 Jul) escreveu: *"chegamos domingo 19 ~20h, o acesso é por caixa de código, certo?"*. O agente redigiu *"a reserva para essas datas não parece disponível"* — alucinação. Causa-raiz: o agente chamou `getCalendar(19-23)` e o Beds24 devolveu "não disponível" **porque essas datas estão ocupadas pela própria reserva do Loïc**. A ferramenta induziu-o em erro: ele tratou um hóspede JÁ reservado como se fosse um cliente a consultar disponibilidade. A instrução "não inventes, diz que vais confirmar" (`AGENT_OUTPUT_INSTRUCTIONS`, ai-agent.ts) já existe, mas foi contornada porque o agente julgou ter dados reais.

## Objetivo

Tornar o agente **consciente da reserva**: para hóspedes com estadia confirmada, nunca questionar/verificar a disponibilidade das próprias datas; e enriquecer o contexto da reserva. Inquiries mantêm o comportamento atual.

## Decisões de design (3 partes)

### 1. Consciência de reserva confirmada (núcleo)
- **Estado da reserva no contexto:** distinguir `confirmed`/`new` (booking real) de `inquiry` (a inquiry da Carolina 89794243 tinha `status='inquiry'`). O `bot-bridge` passa o `booking.status`; a `ReservationContext` ganha um campo derivado `isConfirmed: boolean` (true quando status ∈ {confirmed, new}).
- **Instrução no prompt** (só quando `isConfirmed`): «Este hóspede tem estadia CONFIRMADA de {checkIn} a {checkOut}. Nunca questiones nem verifiques a disponibilidade dessas datas — estão reservadas para ele. Usa o calendário apenas se ele perguntar por datas DIFERENTES (estender, outra estadia).»
- **Guarda na ferramenta `getCalendar`** (defesa em profundidade, `lib/ai-agent-tools.ts`): se o intervalo pedido **sobrepõe** a estadia confirmada do hóspede, devolver conteúdo tipo «Estas são as datas confirmadas do próprio hóspede — reserva confirmada, não é consulta de disponibilidade.» (com `citations: []`), em vez do "não disponível". A sobreposição usa um helper puro testável. Só se aplica quando `isConfirmed`; para inquiries a ferramenta funciona como hoje.
- **Non-goal:** inquiries e perguntas sobre datas diferentes = comportamento atual intacto.

### 2. Contexto mais rico da reserva
`ReservationContext` (em `lib/ai-messaging.ts`) e o que o `bot-bridge` passa ganham:
- `nights` (derivado de check-in/out).
- `guests` = **adultos + crianças** (hoje só passa `numAdult`; passar `numAdult + numChild`).
- `previousStays` (JÁ existe no tipo e no prompt — "Returning guest"): o `bot-bridge` calcula-o cruzando o nome/email do hóspede noutros `beds24_bookings` passados (status confirmado, departure < hoje, mesma pessoa). Best-effort; 0 se não houver match.
- A hora de chegada mencionada pelo hóspede já vem na mensagem — sem dado extra.
O `buildSystemPrompt` já injeta `nights`? NÃO — acrescentar `nights` e usar o `guests` corrigido; `previousStays` já é renderizado.

### 3. Resposta segura quando falta um facto
Reforço leve em `AGENT_OUTPUT_INSTRUCTIONS` (ai-agent.ts): quando falta um facto específico (código de acesso, wifi, etc.), o `reply` de `covered:false` deve reconhecer a pergunta e dizer que a equipa confirma e envia os detalhes antes da chegada — nunca inventar nem deduzir de outras ferramentas. (Com a Fix 1 a evitar a chamada enganosa ao calendário, isto passa a resolver o caso do Loïc.)

## Helper puro (testável)
`lib/reservation-window.ts`: `datesOverlapStay(reqCheckIn, reqCheckOut, stayCheckIn, stayCheckOut): boolean` — sobreposição de intervalos [checkIn, checkOut) em datas yyyy-MM-dd (checkout exclusivo). Testes: intervalo dentro da estadia → true; adjacente (reqCheckIn = stayCheckOut) → false; antes/depois → false; parcial → true.

## Ficheiros
- `lib/reservation-window.ts` (novo, puro) + `scripts/test-reservation-window.ts`.
- `lib/ai-messaging.ts` — `ReservationContext` (+`isConfirmed`, `nights`); `buildSystemPrompt` (instrução confirmada + render de nights).
- `lib/ai-agent-tools.ts` — guarda de sobreposição no `getCalendar` (recebe a estadia confirmada via ctx).
- `lib/ai-agent.ts` — reforço de 1-2 linhas no `AGENT_OUTPUT_INSTRUCTIONS`.
- `lib/beds24/bot-bridge.ts` — passar `status`, `numChild`, calcular `previousStays`, derivar `nights`/`isConfirmed`.
- `DraftContext`/`ReservationContext` propagam a estadia confirmada às tools (o `ctx` já chega ao `buildAgentTools`).

## Verificação
- Teste unitário do helper de sobreposição.
- `tsc` + build.
- E2E manual (Marcelo): reprocessar o booking do Loïc (89906216) pelo bridge → o draft deixa de falar em "não disponível"; para uma inquiry real, disponibilidade continua a responder normalmente; hóspede recorrente mostra saudação de regresso.

## Non-goals
Regras duras, gate de citações, fluxo de aprovação, UI, novas ferramentas. Preencher o conhecimento (secrets das casas) é operacional, não código — mas é o complemento natural (com acesso preenchido, o agente confirma o código na hora).
