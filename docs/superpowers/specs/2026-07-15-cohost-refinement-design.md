# Co-Host refinement — always-draft, módulo próprio, mobile decision feed

**Date:** 2026-07-15
**Status:** design approved (Marcelo) — NÃO aprovado para implementação já; fase futura, depois dos pendentes do bot atual
**Referência:** Lodgify AI Co-Host (beta, cohost.lodgify.com) — padrão "nothing happens without you"
**Contexto:** evolução do bot de mensagens (branch feat/ai-guest-messaging, inbox em admin/activity) + análise em memória `proactive-cohost-analysis`

## 1. Posturas por conversa (substitui Bot on/off)

| Postura | Comportamento |
|---|---|
| **Auto** | bot envia sozinho. Mantém-se no design mas SEM USO por agora (decisão pendente de conversa com o João). |
| **Assist** ⭐ default | bot redige SEMPRE um draft para cada mensagem do hóspede; só o humano envia (envia / edita / ignora / escreve do zero). |
| **Off** | nada — casos raros (hóspede problemático, assunto jurídico). |

- Deteção de resposta humana (`source:"host"`, já temos): passa de kill switch para **despromoção Auto→Assist**. Nunca desliga a redação.
- **Consequência chave:** o problema sistémico das scheduled messages do Airbnb (Booking Confirmation dispara em toda a reserva → auto-off universal) deixa de ser bloqueante — o pior caso é ficar em Assist.
- Draft **regenerado** quando chega nova mensagem do hóspede antes de o humano agir (substitui, não acumula).
- NEEDS_HUMAN (do data-grounded agent design) passa a flag de triagem/urgência no feed, não um stop.

## 2. Módulo "Co-Host" próprio no sidebar

Sai de dentro de Activity. Sub-áreas:
- **Inbox** (o atual, movido)
- **Opportunities** (gap nights — futuro, ver proactive-cohost-analysis)
- **Insights/Digest** (futuro)
- **Knowledge** (property knowledge + Manage memory, hoje no painel direito do inbox)
- **Settings/Monitor** (bot settings, latências, pills)

⚠ Gotcha CLAUDE.md: novo módulo = `guardModule` no layout do segment + `AdminSidebar` em sincronia.

## 3. Mobile = decision feed (PWA)

- **Canal escolhido: A — página mobile-first no backoffice (PWA)**, adicionável ao ecrã inicial. (App nativa descartada; Telegram/WhatsApp = fase posterior SE o João quiser — ver §5.)
- **Ecrã principal: feed de decisões** (padrão Lodgify "Here's what needs you"), NÃO um inbox: um cartão por decisão pendente — mensagem do hóspede resumida + draft + `Aprovar · Editar · Ignorar`. Conversa completa a um toque para contexto. Aprovado → cartão sai.
- O feed é extensível: cartões de Opportunities e proativos entram no MESMO feed mais tarde. O feed É o co-host; mensagens são o primeiro tipo de cartão.
- Badge "N to review" no admin (dashboard/sidebar).
- Inbox completo continua no desktop para investigação profunda.
- Fase posterior natural: separador "Chat" (perguntas livres ao co-host, tipo digest WhatsApp da Lodgify).

## 4. Notificações — web push no v1, com rede de segurança

- **Decisão: web push no v1** (Marcelo aprovou apesar do receio; o push É a feature no mobile — sem ele o feed é uma página que ninguém abre).
- Realidades iOS: exige PWA instalada no ecrã inicial (16.4+) e permissão pedida em gesto do utilizador.
- **Rede de segurança por design:** sem subscription válida (ou push falhado) → fallback de aviso por email via Resend ("tens N drafts à espera"). O pior cenário fica coberto.
- Infra: service worker + tabela de push subscriptions por utilizador.

## 5. Arquitetura de aprovação channel-agnostic

Aprovar/editar/rejeitar = **server actions únicas e partilhadas**. A PWA chama-as; um futuro bot de Telegram/WhatsApp (se o João quiser escalar para lá) chama AS MESMAS. O canal é só a casca — nada de lógica de aprovação no UI.

## Non-goals (agora)
- Coordenação de cleaners / módulos de PMS profundo.
- Separador Chat conversacional.
- Auto mode em uso real (pendente João).
- Alterar datas de reservas Airbnb (impossível via API — só o Airbnb; vale para qualquer PMS).

## Sequência
Pendentes do bot atual (sender shape em prod, hebraico nativo, knowledge, data-grounded agent) → ESTA refactorização (posturas + módulo + feed mobile + push) → Opportunities/proativo.
