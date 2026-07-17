# HANDOFF — Backoffice mobile overhaul (2026-07-17)

Ponto de situação para retomar noutra sessão Claude. Ler também as memórias `admin-mobile-overhaul`, `proactive-cohost-analysis`, `airbnb-ai-guest-messaging`.

## ✅ TUDO EM PRODUÇÃO (`origin/main` @ `79d1f48`)

Série de melhorias **mobile-only** do backoffice (`app/[locale]/admin/*`). Desktop sempre intacto — padrão de breakpoint `md:` (mobile = `<768px`). Sequência de pushes desta sessão: `3a0af0c..79d1f48` (o tema Midnight e as primeiras correções Co-Host vêm de antes, `0210731..3a0af0c`).

### Workflow que o Marcelo gosta (IMPORTANTE, seguir)
Mockup visual primeiro (ferramenta `show_widget`, numa moldura de telemóvel ~330px) → ele aprova ou ajusta → só então código → `npx tsc --noEmit` + `npm run build` → `git push origin main` (deploy automático Vercel) → ele testa no telemóvel real e manda screenshot. Iterar a partir do screenshot.

### ⚠️ Não consigo verificar visualmente
`/admin` exige login e eu não introduzo credenciais. Confirmo sempre com typecheck + build e digo-o explicitamente. A validação visual é o Marcelo que faz por screenshot. O `mcp__Claude_Browser` redireciona para /login.

## O que ficou construído (por área)

### Navegação
- **`components/admin/AdminBottomNav.tsx`** (NOVO, `md:hidden`, montado em `app/[locale]/admin/layout.tsx`): barra inferior fixa Overview·Bookings·Co-Host(badge dourado de pendentes via `getPendingDecisionCount`)·Properties·**More**(abre a gaveta via `useAdminNav().setMobileOpen(true)`). Respeita role/permissões como o `AdminSidebar` (super_admin vê Overview+Co-Host; outros conforme `role_permissions`). Layout ganhou `pb-28 md:pb-10` para o conteúdo não ficar por baixo.
- **`AdminHeader.tsx`** mobile: **SEM hambúrguer** (a gaveta abre só pelo "More" da bottom nav — antes o hambúrguer e o More faziam a mesma coisa). Nome+role à esquerda, sino+avatar à direita. Breakpoint da bottom nav alinhado a `md:hidden` (o sidebar já aparece a partir de `md`, senão coexistiam em tablet).

### Overview (`app/[locale]/admin/page.tsx`)
- Cabeçalho: contexto vira **3 pills numeradas** staying/arriving/departing no mobile (frase longa só desktop); contadores a zero escondem-se.
- **Banner Co-Host compacto** no mobile (`md:hidden`): título+badge / subtítulo OU alerta vermelho / CTA largo "Rever N respostas →" (`reviewReplies`). Banner rico com chips dos drafts = desktop (`hidden md:flex`).
- **Arrivals & Departures** = carrossel horizontal (`scrollbar-hide`, snap) de cartões compactos no mobile; grid no desktop.
- **Property status** = cartões tocáveis no mobile (foto, cidade, próxima chegada, chip estado, contador Co-Host); a tabela é `hidden md:block`.

### Calendário Reservations (`components/admin/reservations/MultiCalendarView.tsx`)
Só a vista **Timeline** foi feita mobile. Estado:
- `isMobile` via `matchMedia("(max-width: 767px)")` + `ResizeObserver` no scroll container (`containerW`).
- **7 dias fixos** no mobile (`effRange = isMobile ? 7 : rangeDays`); larguras de célula = `(containerW − 44) / 7`, mínimo 36px → cabe no ecrã sem scroll horizontal. Seletor 7/14/31 é desktop-only; navegação mobile = grupo compacto ‹ Hoje › + botão-ícone €.
- Rail de propriedades estreito (44px, foto 32px), linhas 48px, barras h-7 sem preço total.
- **€ Prices**: rail 22px; **preço SÓ nas noites livres** (as ocupadas ficam vazias — decisão do Marcelo, faz os buracos vendáveis saltar à vista; casa com futura feature Opportunities/gap-nights). **Sem a lua do min-stay** no mobile. Lógica: `occupiedNights` Set construído das reservas+blocos da linha; `CalendarDayPrice info` recebe `price:null` se a noite está ocupada.
- Linha "hoje" fina (1px, 50%) sem as bolas por linha; legenda compacta própria no rodapé do cartão.
- **FIX sticky** (bug que o Marcelo apanhou: fotos das propriedades sobrepunham o header ao fazer scroll): z-index internos rebaixados de 50/40/30/20 → **14/13/12/11** (empatavam/passavam o `AdminHeader` que é z-20).
- **Swipe** (`077baf0`): `onTouchStart`/`onTouchEnd` no scroll container → arrasta esquerda avança 7d, direita recua; só conta se `|dx|>50 && |dx| > 1.5*|dy|` (não colide com scroll vertical). "Nudge" de ±22px nas linhas via **double-rAF** para a transição pintar sem remontar (não perde a posição de scroll). Só `isMobile`.

### Sheets
- **`DecisionDetailSheet.tsx`** (Co-Host): timestamp da mensagem (`created_at` do rascunho ≈ chegada webhook, ~1s depois do envio real — NÃO é o timestamp exato do Airbnb); **removida a caixa creme "Why this matters"** (o `card_why` gerado era genérico; o campo continua na BD, só não renderiza); **o destaque creme passou para a MENSAGEM DO HÓSPEDE** (texto 15px, é o herói do sheet), com o rótulo dourado reservado ao rascunho; fix alinhamento das linhas de perfil (nomes de propriedade longos colavam ao rótulo → `gap-4` + label `shrink-0` + valor `text-right`).
- **`ReservationDetailSheet.tsx`** (reservas do site/diretas): o cartão STAY/PROPERTY partia a data palavra-a-palavra (`flex justify-between` horizontal apertado) → **empilha no mobile** (`flex-col md:flex-row`, data com `whitespace-nowrap` em cima, propriedade em baixo icon-left); header blindado (wrapper esquerdo `min-w-0 flex-1` trunca o nome, ações `shrink-0`, texto "History" só `≥sm`).

### Tabs do módulo Co-Host (`app/[locale]/admin/cohost/page.tsx`)
Decisions/Inbox/Settings transbordavam no mobile ("Settings" cortado + scroll). Agora **3 terços iguais** (`flex-1`, `flex-col` ícone-sobre-texto no mobile); desktop = pills inline `w-fit`. **Marcelo escolheu a Opção A SEM o badge dourado** de pendentes (variante mostrada e não escolhida).

## i18n adicionada (en/pt/he em paridade)
`AdminCohost.feed.ctxStaying/ctxArriving`, `AiInbox.photo`, `AdminSidebar.more`, `AdminOverview.pillStaying/pillArriving/pillDeparting/nextArrivalShort/reviewReplies`. (he tem dívida conhecida — algumas ficaram em inglês, consistente com o resto do ficheiro.)

## ⭐ PRÓXIMA TAREFA PRIORITÁRIA (Marcelo, 2026-07-17): abrir o Co-Host aos Admin
Hoje **só o `super_admin`** acede a tudo do Co-Host. O Marcelo quer **dar acesso a tudo do Co-Host também ao role `admin`** (Decisions, Inbox, Settings, banner no Overview, badges). O código já anticipa isto (há comentários "depois alargar a 'admin' (uma linha)"). Pontos exatos a mudar de `['super_admin']`/`role === 'super_admin'` para **incluir `'admin'`**:

1. **Guard da rota** — `app/[locale]/admin/cohost/layout.tsx`: `guardRoles(["super_admin"], locale)` → `["super_admin", "admin"]`. (É o portão de acesso às páginas /admin/cohost.)
2. **Data layer do feed/inbox/decisões** — `app/actions/ai-inbox.ts` linha ~52: `const INBOX_ROLES = ['super_admin'];` → `['super_admin', 'admin']`. Cobre `getDecisionFeed`, `getPendingDecisionCount`, `getCohostContext`, `sendReply`, `updateDraft`, `dismissDraft`, `regenerateDraft`, BotSettings, etc. (todas chamam `assertAdmin()` que valida contra `INBOX_ROLES`).
3. **Sidebar** — `components/admin/AdminSidebar.tsx`: linha ~105 (item "Co-Host" + badge) `role === 'super_admin'` → incluir admin; e linha ~58 `if (role !== "super_admin") return;` (fetch do `cohostPending`) → incluir admin, senão o badge não carrega para admins.
4. **Bottom nav** — `components/admin/AdminBottomNav.tsx`: o tab Co-Host e o fetch do `pending` estão gated por `role === "super_admin"` → incluir admin.

**Nuance a decidir com o Marcelo (NÃO assumir):**
- **Banner Co-Host no Overview** (`app/[locale]/admin/page.tsx` + `app/actions/overview.ts` `OVERVIEW_ROLES = ['super_admin']`): o **/admin (Overview) é super_admin-only** — o `page.tsx` redireciona admin→/admin/properties. Abrir a secção co-host do Overview a admins implica primeiro decidir se os admins passam a ter Overview de todo. Provavelmente **fora de âmbito** desta tarefa (os admins entram no Co-Host pelo sidebar/bottom nav, não pelo Overview). Confirmar.
- **Settings do Co-Host** inclui o **toggle global do bot** (BotSettings — liga/desliga o bot em TODAS as casas) e o web push. "Tudo do co-host" implica dar isto aos admins também; se o Marcelo quiser limitar (ex.: admins só Decisions/Inbox, sem o kill-switch global), aí é mais que "uma linha" — precisa de gating por sub-secção. **Perguntar** antes de implementar.

Depois de mudar: `npx tsc --noEmit` + `npm run build` + push. Testar com uma conta `admin` (não só super_admin).

## 🔨 POR FAZER (candidatos ao próximo mockup→fix)
1. **Vista Mês e Ano** do MultiCalendarView em mobile — só a Timeline foi tratada; as outras vistas provavelmente partem na mesma. (O toggle de vistas Timeline/Mês/Ano existe — ver memória `calendar-workspace-state`.)
2. **Calendário da propriedade** (`/admin/properties/[id]?tab=calendar`) em mobile — não tocado.
3. **Owner calendar** (`/owner/calendar`) em mobile — não tocado.
4. **Vista List** de reservas em mobile (`app/[locale]/admin/reservations/page.tsx`, `view==='list'`) — a tabela é `hidden md:block` com cartões mobile já existentes (`ReservationListCard`), mas confirmar que está bem no telemóvel.
5. **Badge dourado de pendentes nos tabs Co-Host** — Marcelo escolheu sem, mas se mudar de ideias: 1 fetch `getPendingDecisionCount` ao nível da `cohost/page.tsx` + span no tab Decisions quando `>0`.
6. **Indicador de ligação âmbar** (ponto que fica âmbar quando o WebSocket Realtime cai) — proposto, não construído.

## GOTCHAS / NOTAS
- **Barras Beds24 mantêm rose-500** no calendário (o mockup mostrava preto; não repintar só o mobile para não desalinhar do desktop; se mudar, mudar nos dois).
- Migrações Supabase são **manuais** — nenhuma foi precisa nesta série (tudo UI/i18n).
- `.claude/launch.json` está modificado localmente (config de preview) — **não committar**.
- Working tree: além do launch.json, há handoffs antigos por committar em `docs/superpowers/` (decisão do Marcelo, não são desta série).
- Ledger de trabalho fora deste handoff: as memórias `proactive-cohost-analysis`, `airbnb-ai-guest-messaging`, `beds24-*` cobrem o co-host/agente/PMS.
