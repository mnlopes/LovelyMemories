# Beds24 PMS — PONTO DE SITUAÇÃO / HANDOFF

**Última atualização:** 2026-07-14. **Começar por aqui** ao retomar (mesmo noutra conta).

## ✅✅ DÚVIDA CRÍTICA RESPONDIDA: o webhook DISPARA com mensagens novas (2026-07-14)
Teste real com a conta Carolina (inquiry 89794243, Virtudes One): cada mensagem gerou um booking webhook (eventos #12-16), latência 349ms–1.3s, mensagens ingeridas em beds24_messages via webhook. **Conclusão: o bot corre por webhook, SEM polling.** Abordagem C decidida a favor do webhook. (Nota: era inquiry/consulta, não reserva confirmada — mesmo assim dispara.)

**Bug encontrado e corrigido:** a conversa da Carolina não apareceu no inbox porque (a) o webhook dela chegou (~22:01) ANTES de a coluna kill-switch existir (~23:21) → o bridge deu erro engolido pelo try/catch; e (b) o inbox mostrava 190 conversas LEGADAS do Hospitable (reservation_id UUID) que afogavam as reais. Correções (commit 3486981): inbox/fila filtram só reservation_id numérico (Beds24); `scripts/reprocess-carol.ts` reprocessa mensagens já guardadas pelo bridge. Carolina recuperada (bot auto-off por human_replied, draft gerado via Gemini).

**⚠ OpenAI sem quota (429)** — o pipeline cai para Gemini automaticamente e funciona; considerar forçar Gemini como default para poupar a chamada falhada. **⚠ 190 conversas legadas Hospitable** continuam na BD (filtradas, invisíveis) — limpar quando o Marcelo aprovar (são dados de POC, nunca produção).

## 🤖 BOT/INBOX MIGRADO PARA BEDS24 (2026-07-14, branch worktree-ai-inbox-beds24)

Plano `docs/superpowers/plans/2026-07-13-beds24-bot-migration.md` — **Tasks 1-9 completas + verificações automáticas da Task 10** (build prod ✅, test:security ✅, test-ai-decision ✅, test-bot-bridge ✅, simulação webhook local ✅ → decisão needs_human correta com draft PT).

**O que existe agora:**
- `lib/ai-messaging.ts` (Gemini, transport-neutral), `lib/ai-decision.ts` (regras duras + decisionMode JSON com citação), `lib/beds24/bot-bridge.ts` (webhook→conversa/fila; host auto-off exceto mensagens nossas; claim idempotente por external_message_id), webhook chama o bridge após ingestão.
- `app/actions/ai-inbox.ts` (inbox/thread/envio via POST /bookings/messages/toggles/tom/knowledge/links via beds24_properties.internal_property_id).
- UI premium em `admin/activity` (tab default "Guest inbox"; tabs Activity Log/Owners preservadas): InboxShell 3 painéis + mobile stack + refresh 30s; ConversationList (fila âmbar no topo, pills bot/humano); ThreadView (bolhas com latência webhook, cartão emerald de auto-send com citação do knowledge, drafts tracejados Enviar/Editar/Ignorar/Regenerar, resposta manual); ContextPanel (reserva, toggle bot com nota auto-off, checklist knowledge ✓/⚠); BotSettings (kill-switch global, off/drafts/auto por propriedade, editor de tom). i18n `AiInbox` 45 chaves en/pt/he em paridade.
- Migrações aplicadas no Supabase (Marcelo): consolidada 20260714090000 + 20260714120000 (kill-switch em ai_messaging_settings) + 20260714130000 (upgrade hospitable→external + decision/knowledge_citation/auto_sent_at). Nota: BD tinha o schema antigo do Hospitable; o upgrade alinhou-o.

**E2E REAL PENDENTE (após merge→main→deploy; precisa do Marcelo):**
1. BotSettings (engrenagem no inbox) → Virtudes One = `drafts`
2. Mensagem da conta Carolina (inquiry 89794243) → draft aparece no inbox com decisão correta
3. Preencher wifi no knowledge (exige ligar Virtudes One a uma propriedade do site via internal_property_id — usar getPropertyLinkSuggestions/savePropertyLinks ou SQL) → nova pergunta wifi → draft coberto
4. Modo `auto` → pergunta wifi → resposta automática chega ao Airbnb com citação → voltar a `drafts` (rollout do spec)
5. Responder pelo Airbnb (conta João) → conversa mostra "humano ativo" (bot off automático)
Regras: auto-send NUNCA sem citação; regras duras (preço/datas/reclamações/cancelamento/early-checkin/bagagem) escalam SEMPRE.
Documentos irmãos: `2026-07-13-beds24-pms-analysis.md` (análise+testes+veredito co-host), `2026-07-13-beds24-phase1-design.md` (design aprovado).

## Estado em uma frase
Fase 1 do PMS Beds24 **em PRODUÇÃO** (só super_admin). Cobaia (Virtudes One) **LIGADA ao Airbnb** (connect:limited) e ciclo completo **provado 2026-07-13 à noite**: criar reserva → bloqueia Airbnb (~1min) + webhook nosso (916ms); cancelar → reabre Airbnb + webhook (537–835ms). Falta o **teste crítico das mensagens** (decide arquitetura do bot).

## O que já está feito ✅
- Análise completa da API v2, testes de escrita/leitura, veredito co-host (só 6 Primary Owner ligáveis; ~39 co-hosted exigem onboarding por owner — Airbnb Teams é beco sem saída).
- Código na branch `main` (mergeado), deployed no Vercel. Ficheiros: `lib/beds24/{client,sync,types}.ts`, `app/api/webhooks/beds24/route.ts`, `app/actions/beds24.ts`, `app/[locale]/admin/beds24/**`, migração `supabase/migrations/20260713200000_beds24_phase1.sql` (aplicada no Supabase), `scripts/check-beds24.ts` (inspetor de tabelas).
- Painel live: **https://www.lovelymemories.pt/{en|pt}/admin/beds24** (só super_admin).
- 6 anúncios Primary Owner importados (connect:none, estado=imported).
- Webhook configurado no Beds24 para Virtudes One + **provado ponta-a-ponta** (reserva teste 89782482 → chegou em ~1s com dados pessoais).

## Credenciais e configuração
- `BEDS24_REFRESH_TOKEN` → em `.env.local` (local) e Vercel env scope **Production**. Não expira se usado a cada 30 dias.
- `BEDS24_WEBHOOK_SECRET` = `efc8403d1a468f61f0620948d96f8d1b1c22c1a9c5eb507a` → `.env.local` + Vercel Production.
- Webhook URL (Beds24 → Settings→Properties→[prop]→Access→Booking Webhook): `https://www.lovelymemories.pt/api/webhooks/beds24`, versão **2 - with personal data**, custom header `x-beds24-secret: <secret>`.
- Domínio real: **www.lovelymemories.pt** (SEM hífen; o hifenizado não existe).
- Conta Airbnb master: `391837499` (Achilleas/Lovely). Beds24 ownerId `171444`. Trial Beds24 expira **~2026-07-27**.

## IDs das 6 propriedades (beds24 propertyId / roomId → airbnb listingId)
- Virtudes One **341090 / 704840** ← **COBAIA** (1652161621003086510)
- Virtudes Two 341089 / 704839 (1652149493924437177)
- The Root 341085 / 704835 (607230809296653833)
- The Alluring (Santa Catarina) 341086 / 704836 (734054353978879876)
- The Terraced Loft (Duque Saldanha) 341087 / 704837 (1543625973258043211)
- Casa Serena Gaia 341088 / 704838 (1639382334426921258)
(propriedade sintética inicial: 341047 — ignorar/apagar)

## FEITO 2026-07-13 à noite (sessão de testes com a cobaia ligada) ✅
- `git push origin main` OK (passou; origin sincronizado). Copy "preview only" → "produção (só super_admin)" (commit 98cd9ba).
- Calendário da cobaia verificado (€110/€100/€150 min2, 30 dias) e batia com o Airbnb.
- **Cobaia LIGADA**: connectCobaia → `{"success":true,"airbnb":{"enabled":true,"listingId":"1652161621003086510"}}` (201, mapping validado). Estado=connected. No Airbnb, Disponível/Bloqueado ficaram cinzentos (Beds24 controla a disponibilidade — bloqueio manual no Airbnb já não é possível).
- **TESTE nós→Airbnb PROVADO**: booking 89784420 (TESTE2, 10–14 mar 2027, criado na UI Beds24) → 10–13 mar bloqueados no multicalendário Airbnb (~1 min); webhook nosso 916ms com dados completos (€440, canal direct).
- **Reversão PROVADA**: cancelar 89784420 e 89782482 → webhooks 835ms/537ms → março 2027 reaberto no Airbnb (€143).
- Airbnb janela de reservas = 12 meses (datas além ~jul 2027 aparecem riscadas — não é bloqueio nosso).
- 🔍 **Observação (confirmar)**: booking 89784763 criado+cancelado PELA NOSSA API (botão do painel) NÃO gerou webhooks — possível echo suppression (Beds24 não notifica alterações feitas pelo próprio API client). Até nos convém (site não recebe eco de si próprio), mas confirmar em próximos testes.
- Nota privada do Airbnb: NÃO acessível por API (spec verificada — /inventory/rooms/calendar não tem campo de nota; comment do booking fica só no Beds24). O "porquê" dos bloqueios vive no nosso painel, não no Airbnb.

## Airbnb→nós PROVADO COM RESERVAS REAIS (2026-07-13 ~19:20) ✅
Após a ligação, o Airbnb empurrou as reservas reais existentes do Virtudes One para o Beds24 → webhooks chegaram todos (eventos id 6–11, latências 618ms–1.2s) → ingeridas na BD com nome, datas e valores completos dos hóspedes (7 reservas, ids 89786490–89786496; detalhes na BD/painel — não listados aqui por serem dados pessoais). O botão "importar reservas" ficou desnecessário para a cobaia (vieram sozinhas). Beds24 também disparou emails "New Booking Notification" por cada uma → Marcelo vai desligar (Settings→Properties→Booking Notifications; redundantes, o nosso painel/PMS é que notifica).

## PRÓXIMOS PASSOS (por ordem)
1. **TESTE CRÍTICO mensagens:** de uma conta Airbnb secundária, enviar mensagem como hóspede ao Virtudes One (via pergunta pré-reserva "Contactar anfitrião", sem reservar) → **ver se o webhook dispara** (responde à dúvida que decide a arquitetura do bot). Se não disparar → medir polling (botão "Sync agora"). Testar outbound (responder pelo painel → ver no Airbnb).
2. **Importar reservas existentes** da cobaia (botão "importar reservas" no painel) — trazer as reservas reais futuras do Virtudes One.
3. **Medir uns dias** (abordagem C: webhook vs polling) com tráfego real na cobaia → decidir qual manter. Até agora: webhook ganha sempre (537ms–1.1s).
4. Depois: repetir ligação nos outros 5 (calendário-check → ligar → webhook config na UI Beds24 por propriedade); planear Fase 2 (onboarding owners via botão connect).
5. Cancelar 89764651 (Joao Teste, propriedade sintética 341047 — inofensivo, sem Airbnb).

## Pendências/limpeza
- ~~89782482 e 89784420~~ cancelados ✅. Falta cancelar 89764651 (sintética, sem urgência).
- ~~Cosmético "preview only"~~ feito ✅ (98cd9ba).
- Apagar o invite code já usado no Beds24 (Marketplace→API).

## ⚠ Emails de erro do Beds24 (17:44, 2026-07-13) — NÃO É BUG NOSSO
Recebidos 6 emails "Airbnb returned an error message for [listing]... The listing is not connected to the requesting client application... migration still in progress — please retry in a while."
Diagnóstico (verificado por API, scripts/diag-beds24.ts): estado de sync LIMPO (todos os 6 sync=none, channels/settings airbnb vazio) — não estamos a empurrar nada. Causa = **migração de app Hospitable→Beds24(Channelsync) no Airbnb ainda a propagar** (removemos Hospitable + ligámos Beds24 hoje). Transitório; deve auto-resolver em minutos–horas (até ~24h). Anúncios OK, hóspedes reservam normal, reserva de teste não foi empurrada. AÇÃO: esperar; NÃO desligar o Beds24. Se persistir >24h → reautorizar no Airbnb ou ticket Beds24. Ferramenta: `npx tsx scripts/diag-beds24.ts`.

## Portal dos owners — análise de cobertura (2026-07-13, só leitura)
Hoje: dashboard do owner lê SÓ `reservations` (owner-analytics.ts); Airbnb entra por **CSV manual** (airbnb-import.ts: Amount/Service fee/Cleaning fee → upsert por confirmation code); iCal alimenta só `blocked_dates` (sem valores; nem conta para ocupação). Beds24 cobre tudo e melhor: guest_name/price/commission/channel em ~1s via webhook; numAdult/numChild (o CSV nem traz — hóspedes=0 nos imports!); email/telefone. **Validar no cutover (ponte beds24_bookings→reservations):**
1. `cleaning_fee` — confirmar que vem nos `invoiceItems` do webhook (raw JSONB já guardado; 1ª reserva real do Virtudes One responde).
2. `commission` (Beds24) vs "Service fee" (CSV Airbnb) — conferir números na 1ª reserva real contra o extrato Airbnb.
3. `payout_date` — Beds24 não sabe quando o Airbnb paga. Regra Airbnb (verificada 2026-07-13, help 425): estadias ≤27 noites → payout libertado até ao fim do dia útil seguinte ao check-in; 28+ noites → 1º payout igual + parcelas mensais durante a estadia; chegada ao banco +1–5 dias úteis conforme método. Logo é DERIVÁVEL: payout_date ≈ check_in + 1 dia útil; CSV fica só para reconciliação financeira mensal, se necessário.
Histórico antigo fica dos CSVs já importados; `importBookings` traz as existentes/futuras.

## ✅ DÚVIDA CRÍTICA RESPONDIDA (2026-07-13 ~23:00) — WEBHOOK COBRE MENSAGENS
Teste com conta Airbnb secundária ("Carolina", inquiry 10–14 nov 2026 no Virtudes One → booking Beds24 89794243):
- **Pré-requisito descoberto:** Beds24 → Settings→Channel Manager→Airbnb→Mapping→[propriedade]→Property Settings → **"Inquiry and Requests" estava "Ignore"** (default!) → mudado para **"Import all"**. Com "Ignore", inquiries/mensagens NUNCA chegam (nem UI Beds24 as mostra). Configurar isto em TODAS as propriedades ao ligar.
- **Webhook dispara com mensagens novas** (sem alteração de reserva): eventos standalone chegaram a cada mensagem. Latências: guest ~4s, host ~6-7s ponta-a-ponta.
- **Inquiry pré-reserva vira booking** (status inquiry) + payload traz messages[].
- **🔑 DETEÇÃO DE RESPOSTA HUMANA RESOLVIDA:** respostas do host enviadas NA UI DO AIRBNB chegam via webhook com `source: "host"` em segundos — o que era impossível no Hospitable (source uniforme "platform"). O bot pode auto-desligar quando um humano entra na conversa.
- **Outbound provado:** resposta enviada do nosso painel (POST /bookings/messages) apareceu na conta do hóspede no Airbnb em segundos.
- **DECISÃO DE ARQUITETURA: bot de IA usa WEBHOOK (sem polling).** Polling fica só como reconciliação de segurança de baixa frequência.
- Sync Type do mapping: só existem 3 níveis (Prices and Availability / Limited / Everything) — NÃO há "availability only" para Airbnb. Preços passam SEMPRE a ser geridos no Beds24/nosso PMS após ligação. Conversar com o João (ele queria gerir preços no Airbnb — não é possível com channel manager; a gestão passa para o nosso backoffice).
- Limpeza extra pendente: cancelar/apagar inquiry de teste 89794243 (Carolina) + cosmético painel: caixa de resposta repete-se por cada mensagem do mesmo booking (replyFor é por booking).
