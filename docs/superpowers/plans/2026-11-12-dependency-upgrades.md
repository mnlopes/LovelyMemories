# Atualização de dependências e segurança — plano (antes da área de vendas)

**Objetivo:** fechar as vulnerabilidades conhecidas e pôr as dependências em dia antes de começar a área "imóveis à venda" (Opção A), sem partir checkout, login, iCal nem o backoffice.

**Estado de partida (2026-11-12):**
- `npm audit`: 32 vulnerabilidades (2 críticas, 18 altas). As críticas são `next` 16.1.4 e `jspdf` 4.0.0.
- `npm outdated`: 43 pacotes desatualizados.
- `tsc --noEmit`, `npm run build` e `npm run test:partner-api` (42/42) passam todos.

**Regras gerais**
- Cada fase vai num deploy separado: branch → Preview na Vercel → testes → produção. Se algo falhar, volta-se atrás com o Instant Rollback da Vercel.
- O `.env.local` aponta para a Supabase de **produção**, com Stripe em modo **teste**. Uma reserva de teste feita em local fica gravada na BD real: usar uma casa de teste e apagar a reserva no fim.
- **Não correr `npm run test:security`**: chama `processReservation` e cria uma reserva real na BD.
- `npm audit fix --force` está proibido: salta versões major sem controlo.

---

## Fase 0 — Preparação (~30 min)

- [ ] Confirmar a versão de Node do projeto na Vercel (Settings → Build & Deployment → Node.js Version). O Node 20 foi descontinuado a 2026-10-01. openai 7, ical-generator 11 e supabase-js ≥2.110 exigem Node ≥22.
- [ ] Fixar `"engines": { "node": "24.x" }` (ou a versão que a Vercel usa) em `package.json` e alinhar `@types/node` com essa major.
- [ ] Confirmar que as variáveis de ambiente **Preview** da Vercel usam chaves Stripe de **teste**.
- [x] Criar a branch `chore/deps-2026-11`.

## Fase 1 — Segurança urgente, sem alterações de comportamento (~3–4h)

- [x] `npm audit fix` (sem `--force`). Corrige as dependências transitivas e ainda `jspdf` 4.2.1, `zod` 4.6.7, `next-intl` 4.15.1, `resend` 6.38, `js-cookie`, `react-use`, `dompurify`, `ws`, `nodemailer` e outros.
- [x] `next` e `eslint-config-next` → 16.4.6. Fecha cerca de 45 advisories, incluindo DoS nas Server Actions/RSC, CSRF com origin nula e bypasses do proxy.
- [x] `react` / `react-dom` → 19.3.1; `@types/react` / `@types/react-dom` → 19.3.0.
- [x] Remover dependências sem uso: `styled-components` (0 referências) e `node-ical` (0 imports; `app/actions/ical.ts` usa um parser próprio).
- [x] `next.config.ts:23`: remover `lovely-memories.pt` de `remotePatterns`. O domínio com hífen não existe e qualquer pessoa o pode registar (risco de SSRF no otimizador de imagens).
- [x] `app/[locale]/property/[id]/page.tsx:167`: a imagem do agente no `BookingSidebar` (não é JSON-LD) passa a `/icon-512.png`, local. Sem esta troca, retirar o domínio dos `remotePatterns` partia a página.
- [x] ~~`lib/push.ts`: trocar para `import * as webpush`~~ — **revertido.** Na web-push 3 (CJS) o namespace import devolve `setVapidDetails` / `sendNotification` como `undefined` (testado com tsx). Fica o default import; ver a Fase 3.
- [x] Bumps menores sem risco (coluna "Wanted"): tailwindcss / @tailwindcss/postcss 4.3.5, date-fns, react-hook-form, recharts, lenis, papaparse, tailwind-merge, sonner, react-icons, jspdf-autotable. **Não mexer ainda em `@supabase/*` nem `stripe`** (ficam para a Fase 2).
- [ ] Verificação: `tsc --noEmit`, `npm run build`, `npm run test:partner-api`, `npm audit` (objetivo: 0 críticas, 0 altas) e depois a checklist de testes (abaixo).
- [x] Deploy: o Preview falhou porque o ambiente Preview da Vercel não tem `STRIPE_SECRET_KEY` (já falhava antes, nas mockups de 27/10). A instalação, a compilação e o TypeScript passaram na Vercel. Merge para `main` (`4fb375d`) a 2026-11-13, 15:19. Verificado em produção: 54/54 páginas a 200, cron do iCal a correr, 0 erros de sincronização.

## Fase 2 — Atualizações que exigem código (~1–1,5 dias, em 3 deploys)

### 2a. Supabase (auth) — risco médio
- [ ] `@supabase/ssr` 0.12.7 e `@supabase/supabase-js` 2.119, sempre juntos (a ssr 0.12 exige supabase-js ≥2.114).
- [ ] Migrar 14 ficheiros da API de cookies antiga (`get/set/remove`, marcada deprecated) para `getAll/setAll`:
  - `lib/supabase.ts`
  - `app/actions/{airbnb-import,auth-context,cms,impersonation}.ts`
  - `app/[locale]/admin/{layout,finances/page,imports/page,performance/page,properties/[id]/page}.tsx`
  - `app/[locale]/owner/page.tsx`
  - `app/[locale]/(main)/blog/{page,[slug]/page}.tsx`
  - `components/AboutSocialWall.tsx`
- [ ] `app/api/auth/confirm/route.ts`: aplicar os cabeçalhos anti-cache que o `setAll` passa a receber como 2.º argumento.
- [ ] Testes focados: login, logout, set-password, reset de password, convite de equipa, sessão do admin e do owner, impersonation.

### 2b. Stripe (checkout) — risco ALTO se for feito sem a correção
- [ ] `stripe` 23.1, `@stripe/stripe-js` 10.2 e `@stripe/react-stripe-js` 7.0, os três juntos.
- [ ] `lib/stripe.ts`: fixar `apiVersion` explicitamente. Hoje não está definido e herda o default do SDK.
- [ ] `app/actions/stripe.ts:138`: na API `2026-10-28.endive`, `payment_method_types` dá erro 400 e **todos os pagamentos falhariam**. Trocar por `allowed_payment_method_types: ['card','link']`. Este parâmetro só existe a partir da API 2026-07-29, por isso a correção e o upgrade do SDK têm de ir no mesmo deploy.
- [ ] Depois do deploy, atualizar a versão de API do endpoint de webhook no Stripe Workbench (pode-se reverter durante 72h).
- [ ] Testes: cartão 4242 4242 4242 4242, cartão 3DS 4000 0027 6000 3184, cartão recusado 4000 0000 0000 0002; o webhook confirma a reserva; chega o email de confirmação; a fatura PDF descarrega.

### 2c. Bibliotecas de UI — risco baixo/médio
- [ ] `lucide-react` 1.x. A v1 removeu os ícones de marcas; trocar os 4 por `react-icons` (já instalado):
  - `components/Footer.tsx` (Facebook, Instagram, Linkedin)
  - `components/admin/AnalyticsPanels.tsx` (Chrome)
  - `app/[locale]/admin/content/page.tsx` (Instagram)
  - `components/admin/content/SocialWallManagement.tsx` (Instagram)
- [ ] `react-day-picker`: primeiro, ainda na v9, renomear as chaves `classNames` antigas (estilo v8), que **já hoje não fazem nada**. Por exemplo, o destaque do intervalo em `BlockedDatesSheet.tsx` não está a ser aplicado. Ficheiros: `components/ui/Calendar.tsx`, `HomeCalendarPopover.tsx` (apagar também o `HomeCustomCaption` morto), `BlockedDatesSheet.tsx`, `SearchCalendarPopover.tsx`, `BookingCalendarPopover.tsx`. Só depois subir para a v10.
- [ ] `framer-motion` 14 (84 ficheiros, sem APIs removidas), `openai` 7 (só exige Node ≥22), `@hookform/resolvers` 7, `ical-generator` 11, `html-react-parser` 6, `dotenv` 18 (passa para devDependencies; a app não o usa).
- [ ] Testes visuais: calendários (pesquisa, página da casa, bloqueios no admin), footer, animações da homepage, feed iCal exportado.

## Fase 3 — Mais tarde / dívida técnica (~1 dia, não bloqueia as vendas)

- [ ] **`@google/generative-ai` → `@google/genai`.** O SDK antigo está arquivado e sem suporte desde 2025-11-30. Usado no Co-Host (`lib/ai-agent-providers.ts`, `lib/ai-messaging.ts`) e nas traduções (`app/actions/translate.ts`). Na migração, fixar os modelos: a genai 3 usa a API v1, onde os aliases `gemini-*-latest` não existem, e `translate.ts` ainda lista modelos gemini-1.5 já retirados.
- [ ] `proxy.ts:13`: o teste `isPrefetch` não deteta os prefetches do App Router (cabeçalho `Next-Router-Prefetch`). Hoje cada prefetch faz `getUser`, a query do perfil, a verificação de manutenção e um insert em `visitor_logs`.
- [ ] Alinhar a região das funções Vercel com a da Supabase (hoje correm em `iad1`, EUA).
- [ ] TypeScript 6.0.3, juntando `"types": ["node"]` ao tsconfig. **TS 7 fica à espera**: o typescript-eslint exige `<6.1.0`, e o TS 7 só terá API JS na 7.1.
- [ ] ESLint 10: esperar que eslint-plugin-react, eslint-plugin-import e eslint-plugin-jsx-a11y declarem suporte. Por agora, ficar no 9.39.5.
- [ ] `web-push` 4.0: saiu a 2026-11-10; esperar algumas semanas. O upgrade e a troca do import (`import * as webpush` ou named imports) têm de ir **juntos**, porque o namespace import não funciona na v3. Testar o carregamento do módulo sem enviar notificações.
- [ ] Traduções em falta em `messages/he.json` (já existiam antes do upgrade): `PropertyDetail.readMore`, `PropertyDetail.cityTax`, `PropertyDetail.concierge.defaultService`.
- [ ] `app/[locale]/(main)/contact/page.tsx:5`: `generateMetadata` acede a `params.locale` de forma síncrona (o Next 16 exige `await params`). O título sai certo, mas gera erro no log.
- [ ] Regras novas do eslint-config-next 16.4: o lint da app passou de 576 para 616 erros (`react-hooks/set-state-in-effect` e `react-hooks/immutability`). Não afeta o build.
- [ ] `minimatch` dentro de `@typescript-eslint/typescript-estree`: 7 advisories moderados, só nas ferramentas de lint (não vão para produção). Resolve-se quando o typescript-eslint subir para minimatch ≥11.
- [ ] Retenção de `visitor_logs` (423 mil linhas, +35 mil por mês).

---

## Checklist de testes (fluxos críticos), em cada deploy

**Site público**
1. Homepage em en / pt / he (RTL), com troca de língua.
2. Pesquisa com o calendário de datas; listagem de casas.
3. Página da casa: galeria, calendário de disponibilidade, cálculo de preço.
4. Checkout com Stripe de teste → página de confirmação → email → reserva no admin → fatura PDF.
5. Formulários de contacto (geral, concierge, proprietário) e newsletter.
6. Blog: listagem e artigo.
7. `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/api/ical/[propertyId]` (o feed abre e é válido).

**Backoffice e portal**
8. Login, logout, set-password, reset de password.
9. Admin: Overview, Reservations (lista, detalhe, PDF), calendário da casa e folha de bloqueios, Imports (estado do iCal), Coupons, Finances, Content, Co-Host (inbox e push), Partners.
10. Portal do proprietário: dashboard e exportação mensal em PDF.
11. Impersonation.

**Processos em segundo plano (depois de ir para produção)**
12. `ical_last_sync_at` atualiza em ~7 min, sem novos `last_sync_error`.
13. Stripe → Webhooks: entregas com 200.
14. `npm run test:partner-api` e o smoke test da API de parceiros.
15. Logs da Vercel sem novos 500 durante 24h.
