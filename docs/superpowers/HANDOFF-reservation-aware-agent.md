# HANDOFF — Reservation-aware guest agent (para outro agente executar)

**Criado:** 2026-07-17 por sessão anterior (Marcelo aprovou o design; pediu handoff em vez de execução imediata).
**Estado:** spec + plano ESCRITOS e aprovados. **Por EXECUTAR.** Nada de código feito ainda.

## O que ler primeiro
1. Spec: `docs/superpowers/specs/2026-07-17-reservation-aware-agent-design.md`
2. Plano (5 tasks, TDD, código completo em cada passo): `docs/superpowers/plans/2026-07-17-reservation-aware-agent.md`
3. Memória `proactive-cohost-analysis` e `airbnb-ai-guest-messaging` (contexto do agente).

## Contexto de 1 minuto
O agente de mensagens de hóspede (co-host) JÁ existe e é data-grounded (`lib/ai-decision.ts` `decide()` → `runAgent` em `lib/ai-agent.ts` com tools `getKnowledge`+`getCalendar` em `lib/ai-agent-tools.ts`). BUG diagnosticado ao vivo: para um hóspede com reserva CONFIRMADA (Loïc, Casa Serena, 19→23 Jul) que perguntou sobre o código de acesso, o agente foi verificar a disponibilidade das datas 19-23 no `getCalendar`, o Beds24 devolveu "não disponível" (porque as datas estão ocupadas pela própria reserva do Loïc), e o agente redigiu "a reserva não parece disponível" — alucinação. Falta ao agente saber que fala com um hóspede JÁ reservado.

## O que o plano faz (5 tasks)
1. `lib/reservation-window.ts` — helper puro `datesOverlapStay` + teste.
2. `ReservationContext` + prompt: campo `isConfirmed`/`nights`; instrução "não verifiques disponibilidade das datas confirmadas".
3. Guarda no `getCalendar`: se o intervalo pedido sobrepõe a estadia confirmada → devolve redireccionamento em vez de "não disponível".
4. `bot-bridge` passa `status`(→isConfirmed), pessoas reais (adultos+crianças), `nights`, `previousStays` (recorrência).
5. Reforço da instrução "não inventar" + E2E.

## Como executar
- Ramo: **main local, SEM push** (padrão do Marcelo — todo o trabalho de co-host está em main local não pushed). Confirmar com ele antes de qualquer push.
- Método: **subagent-driven** (`superpowers:subagent-driven-development`) sobre o plano, como as features anteriores. Ledger em `.superpowers/sdd/progress.md`.
- SEM migrações de BD. `beds24_bookings` já tem `status`, `num_child`, `guest_email`, `arrival`, `departure`.
- Verificação: teste do helper (`npx tsx`), `tsc`, `build`. E2E é do Marcelo (reprocessar booking 89906216 com o padrão `scripts/reprocess-carol.ts`).

## Gotchas do repo (ler CLAUDE.md)
- Ficheiros `'use server'` só exportam funções async.
- `bot-bridge.ts` é código vivo do webhook — mudanças mínimas, nunca lançar.
- i18n só se houver strings de UI novas (este plano não tem — só prompt do LLM em inglês, que é interno).

## Estado geral do co-host (para contexto)
16 commits de co-host em main LOCAL não pushed (refinamento posturas+push, home redesign Lodgify-style, polish dos cartões). Migrações Supabase pendentes de aplicar: `20260716090000_cohost_posture`, `20260716100000_cohost_push_subscriptions`, `20260716120000_cohost_card_meta`. Esta feature (reservation-aware) entra no mesmo push a prod depois do E2E.
