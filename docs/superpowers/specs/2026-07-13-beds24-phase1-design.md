# Beds24 PMS — Fase 1: Design (aprovado em brainstorming 2026-07-13)

**Contexto completo:** ver `2026-07-13-beds24-pms-analysis.md` (análise API, testes validados, veredito co-host, faseamento).
**Estado:** Secções 1-2 aprovadas explicitamente pelo Marcelo; secções 3-6 derivadas das respostas de clarificação (aprovar na revisão do spec). Próximo passo: rever este doc → `superpowers:writing-plans` → implementar.

## Objetivo e critério de sucesso (palavras do Marcelo)

Sincronização **bidirecional quase em tempo real** nos 6 anúncios Primary Owner:
- Airbnb→nós: qualquer alteração lá (reserva, cancelamento, bloqueio) apanhada rapidamente e visível no calendário do painel.
- Nós→Airbnb: reserva/cancelamento/alteração do nosso lado aparece rapidamente no Airbnb.
- Mensagens: inbound apanhada logo, com remetente e informação completa; outbound enviada do painel e a aparecer rápido no Airbnb.
- **Requisito nº 1: NADA pode afetar o site em produção.**

## Decisões de clarificação (respostas do Marcelo)

1. **Natureza:** fundação real de produção (não laboratório descartável). lib, tabelas e webhook ficam; o painel evolui depois para a UI premium.
2. **Dados:** tabelas novas `beds24_*` isoladas; ponte para `reservations`/`blocked_dates` só no cutover.
3. **Mapping:** 1 cobaia primeiro (proposta: **Virtudes One**, confirmar), validar, depois os outros 5.
4. **Painel:** as 4 componentes — estado+webhook log, reservas das 6, inbox mensagens, comparação preços Beds24 vs Airbnb.
5. **Âmbito Fase 1:** sync bidirecional + push de reserva de teste manual (datas 2027, reverter). FORA: ligar checkout do site (só pós-cutover), bot IA (Fase 2), onboarding owners (Fase 2).
6. **Estratégia de sync: Abordagem C** — instrumentação dupla (webhook + polling em paralelo), medir uns dias na cobaia, desligar o redundante com dados.

## Secção 1 — Isolamento da produção (APROVADA)

1. Branch `feat/beds24-pms`; nada entra em `main` até ao cutover.
2. `BEDS24_REFRESH_TOKEN` (+ `BEDS24_WEBHOOK_SECRET`) em env vars Vercel **scope Preview only** — produção sem credenciais.
3. Kill-switch: `lib/beds24/client.ts` sem env → todos os módulos respondem "desativado".
4. BD: só tabelas novas `beds24_*`; sem FKs/triggers/alterações a tabelas existentes; IDs externos como valores simples.
5. Zero alterações a código partilhado (proxy.ts, checkout, crons, calendários atuais). Tudo em ficheiros novos.

## Secção 2 — Arquitetura (APROVADA)

```
lib/beds24/client.ts   — HTTP client; auto-refresh do token 24h; regista créditos
                         (X-Request-Cost/Remaining) de CADA chamada; kill-switch
lib/beds24/sync.ts     — interface Beds24SyncSource; impls: webhook (passivo) e
                         polling (ativo); resto do código agnóstico
lib/beds24/types.ts    — tipos Beds24 (booking, message, calendar…)
app/api/webhooks/beds24/route.ts — recebe webhooks; valida header secreto;
                         grava payload bruto + timestamps (latência = timeStamp
                         do payload vs recebido)
app/actions/beds24.ts  — server actions: sync manual, importar as 6, enviar
                         mensagem, criar/cancelar reserva teste, comparação preços
app/[locale]/admin/beds24/ — painel, guardModule (admin/super_admin)
```

Padrões do repo: actions para lógica; API route só para o webhook; guard como nos outros segmentos admin (+ entrada no AdminSidebar, manter em sync com admin-guard).

## Secção 3 — Modelo de dados (tabelas novas, migração manual no Supabase)

- `beds24_config` — 1 linha: token 24h em cache + expiry, últimas leituras de créditos, flags (polling on/off, webhook on/off).
- `beds24_properties` — mapa: beds24 propertyId/roomId ↔ airbnbListingId ↔ (opcional) property_id interno como valor simples; role; sync_state (none/imported/connected); is_cobaia.
- `beds24_bookings` — upsert por beds24 booking id; campos: status, arrival, departure, guest (nome/email/telefone), numAdult/Child, price, commission, channel, apiReference, raw JSONB, first_seen_via (webhook|polling), timestamps.
- `beds24_messages` — id, bookingId, source (guest/host/system/internalNote), message, time, read, first_seen_via, latência.
- `beds24_webhook_events` — payload bruto JSONB, received_at, payload timeStamp, latency_ms, tipo, processed.
- `beds24_api_log` — endpoint, custo em créditos, remaining, timestamp (alimenta o medidor de créditos e o relatório A-vs-B).

## Secção 4 — Painel `/admin/beds24`

1. **Estado & medições:** ligação, créditos em tempo real (gauge), webhook log com latência medida, comparativo webhook vs polling (quem viu primeiro cada evento, por quanto).
2. **Reservas das 6:** lista + mini-calendário por propriedade com dados completos do hóspede/valores.
3. **Inbox mensagens (cobaia):** conversas, remetente, envio de resposta; medir tempo até aparecer no Airbnb (verificação manual).
4. **Comparação preços/disponibilidade** Beds24 vs Airbnb por propriedade antes de ligar cada uma (rede de segurança do mapping).
5. Ações: importar as 6 (connect none), ligar cobaia (limited), sync manual, reserva de teste 2027 + reverter.
UI: funcional/limpa nesta fase (a UI premium awwwards é objetivo do PMS final, não do painel de medição).

## Secção 5 — Fluxos críticos

- **Inbound:** webhook → grava evento → upsert booking/messages; polling (acionado manualmente no preview, ou scheduler externo; crons Vercel não correm em preview) faz o mesmo caminho com `modifiedFrom` — dedupe por booking id + modifiedTime; regista quem chegou primeiro.
- **Outbound teste:** POST /bookings (2027) na cobaia → cronometrar até aparecer no multicalendário Airbnb (verificação manual do Marcelo) → cancelar → confirmar reversão.
- **Mensagens teste crítico:** enviar msg como hóspede (conta secundária) → ver se webhook dispara; senão polling 2 min. Outbound: enviar do painel → ver no Airbnb.
- **Erros:** toda a chamada falhada fica em beds24_api_log com erro; webhook com secret errado → 401 sem processar; retries do Beds24 são idempotentes (upsert).

## Secção 6 — Fora de âmbito (Fase 1)

Checkout→Beds24 automático; bot IA (transporte fica preparado via inbox); onboarding owners/botão connect (Fase 2, pedir botão ao suporte Beds24 entretanto); ponte beds24_bookings→reservations (cutover); UI premium.

## Riscos & notas

- Mapping da cobaia empurra preços → usar comparação (painel §4.4) ANTES de ligar; sync "limited"/Prices & Availability, NUNCA "Everything".
- Perigo UI Beds24: dropdown Connect permite mapear ao listing errado — mapping sempre por API com validação roomId↔listingId.
- Webhook em preview: URL do branch estável; se Deployment Protection ativa, usar Protection Bypass header (Beds24 suporta custom headers).
- Refresh token atual está no scratchpad da sessão (`beds24-tokens.json`) — passar para env var Vercel Preview na implementação; o Marcelo deve apagar o invite code usado.
- Instant book: anúncios ligados por API ficam instant book (política Airbnb) — confirmar com João antes de ligar a cobaia.

## Próximos passos

1. Marcelo revê este spec.
2. `superpowers:writing-plans` → plano de implementação detalhado.
3. Implementar no branch `feat/beds24-pms` (worktree), deploy preview, env vars, migração SQL (aplicar manualmente no Supabase), webhook config nas 6, importar as 6, medir.
