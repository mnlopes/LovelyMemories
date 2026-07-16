# Co-Host home redesign — cartões Lodgify-style + fusão com o Overview

**Date:** 2026-07-16
**Status:** approved (Marcelo, via mockups — artifact v3-fusao-overview)
**Mockups:** https://claude.ai/code/artifact/52b07b7d-6ee9-4750-93dd-8fe5ea045e09 (mobile aprovado no v1; desktop aprovado no v3 "fusão")
**Base:** módulo Co-Host já em prod-local (spec 2026-07-15-cohost-refinement-design.md, commits 2a79a74..d1cf792)

## Decisões (brainstorm 2026-07-16)

1. **Resumos por LLM**: título sintético + resumo 2 linhas + "porque importa", gerados NA MESMA chamada do draft.
2. **Desktop = fusão com o Overview existente** (Portfolio Dashboard, hoje com dados fake): mantém o esqueleto visual, ganha o banner Co-Host, dados passam a reais.
3. Entrada do backoffice: super_admin aterra no Overview `/admin` (verificar se já é o landing atual; se sim, zero mudanças de redirect).
4. Rollout: **elementos Co-Host só para super_admin** (banner, coluna Co-Host, feed). Chegadas/estado das propriedades podem render para admin (dados que já vêem noutros ecrãs), mas as actions novas ficam guardadas.

## 1. Cartões com resumo inteligente (fundação de dados)

- `decide()` (lib/ai-decision.ts) devolve também `card: { title, summary, why }` — título 2–4 palavras no idioma do admin-side PT (ex. "Early check-in + Wi-Fi"), summary ≤2 frases (situação + o que o draft propõe), why 1 frase. Mesmo call LLM (campos extra no JSON de resposta), não é chamada adicional.
- Migração manual: `ai_message_log` + 3 colunas `card_title text, card_summary text, card_why text`. Bridge guarda-as ao enfileirar (queue path e auto-send falhado).
- **Fallback puro** (função testável): quando null (drafts antigos, hard_rule sem LLM) → title = primeira linha da mensagem truncada (~40 chars), summary = preview da mensagem, why = null (secção esconde-se). O feed NUNCA depende do LLM para renderizar.
- `getDecisionFeed()` devolve os 3 campos novos (com fallback aplicado no server).

## 2. Feed Lodgify-style (módulo Co-Host — mobile e desktop)

- **Cartão compacto** (substitui o cartão atual): eyebrow `Hóspede · Propriedade · contexto temporal` (contexto = "chega em N dias"/"em estadia"/"saiu" derivado de check_in/out) + chip âmbar "Precisa de ti" (needs_human/hard_rule) → título bold → resumo 2 linhas → pill "Rever resposta". SEM mensagem crua nem draft no cartão.
- **Detalhe ao toque**: componente único responsivo `DecisionDetailSheet` — bottom sheet no mobile, painel lateral direito no desktop (padrão framer-motion do `Beds24BookingDetailSheet`). Conteúdo: perfil (Hóspede/Estadia/Propriedade/Pessoas), callout dourado "Porque importa" (esconde se null), mensagem original, **draft editável** (textarea), barra preta grande "✓ Aprovar e enviar" + botões Ignorar e Abrir conversa (deep-link existente). Ações = as MESMAS server actions (updateDraft/sendReply/dismissDraft) — channel-agnostic mantém-se.
- **Header do feed** (tab Decisões): saudação por hora do dia + nome do profile + linha de contexto (`N por rever · N em estadia · N chegadas hoje`).
- **Concluídas**: por baixo do feed, cartões pequenos ✓ ("Resposta enviada à X · propriedade · há Nh") — últimas 24h (`ai_message_log` status='sent', inclui auto_sent). Nova query no mesmo action do feed (retorno `{ pending, completed }` — atenção: 'use server', tipos não exportados).

## 3. Overview `/admin` — fusão (desktop e mobile empilhado)

Esqueleto do Portfolio Dashboard mantém-se; conteúdo passa a real:

- **Header**: "Bom dia/Boa tarde, {nome} 👋" + linha `Dia, data · N em estadia · N chegadas hoje · N partidas amanhã`. Botão "New Property" mantém-se.
- **Banner Co-Host** (novo; só super_admin): fundo escuro, ✳ + "O teu Co-Host" + badge branco "N por rever" + sub-linha + chips com os `card_title` dos drafts pendentes (máx 3) + chip vermelho de alerta (envio falhado/draft>24h, o mais urgente) + CTA dourado "Abrir Co-Host →" (→ /admin/cohost).
- **Chegadas & Partidas** (substitui "Upcoming Bookings"): cartões com foto real da propriedade (`properties.images[0]`), chip de estado (Chega hoje / Sai amanhã / Chega {dia} / Em estadia), hóspede, propriedade, datas, nº hóspedes. Fonte: `reservations` confirmadas + blocos Airbnb (`blocked_dates` source airbnb_booking) numa janela hoje→+7d, ordenados; máx ~8 com scroll horizontal. Link "Ver calendário →" (/admin/reservations).
- **Estado das propriedades** (substitui "Property Inventory"): tabela real — foto+nome+cidade, estado hoje (Ocupada/Livre/Chega hoje, derivado das reservas do dia), próxima chegada, coluna **Co-Host** "N por rever" (só super_admin; agrupa pending por property), menu "…" → link para a propriedade. Rendas fake DESAPARECEM.
- **Dados**: uma server action `getOverviewData()` (guard admin+super_admin; a parte co-host embutida só é calculada/devolvida para super_admin). Alerts v1 = envios falhados 24h + drafts >24h.

## 4. Entrada

Se o login de super_admin já aterra em `/admin` (Overview), nada muda. Caso contrário, ajustar o redirect pós-login para `/admin` (só super_admin).

## Non-goals
KPIs financeiros (revenue/occupancy tiles), separador Chat, Opportunities, second brain, alterações ao Inbox/Settings do módulo. Hebraico nativo continua dívida global.

## Verificação
tsc + build por task; teste unitário do fallback dos cartões; E2E manual (Marcelo, localhost): Overview com dados reais + banner, feed com cartões compactos, sheet mobile + painel desktop, aprovar/editar/ignorar, dark mode, mobile empilhado.
