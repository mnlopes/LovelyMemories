# Auditoria da plataforma Lovely Memories — 13/11/2026

Análise **só de leitura** feita em quatro frentes: segurança, lógica da aplicação, SEO e qualidade de código. Nenhum dado foi alterado: não houve emails, pagamentos nem escritas na base de dados. Os achados marcados com ✅ foram confirmados à mão (código lido de ponta a ponta, consulta real ou pedido ao site em produção). Os restantes são achados dos agentes de análise, com o caminho de código indicado, mas sem confirmação independente.

## Resumo

A plataforma **funciona e está estável**:
- As 54 páginas do sitemap respondem 200.
- O cron do iCal sincroniza e não há casas com erro.
- Os pagamentos são recalculados no servidor.
- O webhook da Stripe verifica a assinatura.

Os problemas sérios estão em quatro sítios:
1. **Permissões na base de dados:** dados pessoais da equipa e dos proprietários estão legíveis publicamente.
2. **Ações do servidor sem verificação de permissões.**
3. **Alguns erros no fluxo de reserva:** um deles já afetou um hóspede real.
4. **As páginas das casas chegam ao Google sem conteúdo**, porque são carregadas no browser, e o Google Analytics não está a recolher dados.

### Fase 1 (dependências) — em produção desde 13/11, 15:19
Commit `4fb375d`:
- `npm audit` sem vulnerabilidades críticas nem altas.
- As 54 páginas respondem 200.
- O cron do iCal correu às 15:21 com a versão nova.

O erro 500 em `/[locale]/property/[slug]` **já existia antes do upgrade**: foi confirmado compilando a versão anterior (Next 16.1.4), que dá o mesmo erro `DYNAMIC_SERVER_USAGE`. Ver SEO-6.

---

## Estado das correções (atualizado a 14/11/2026)

| Achado | Estado | Como foi verificado |
|---|---|---|
| S-1 — tabela `profiles` pública | ✅ **Corrigido** a 13/11 (migração `20261113150000`) | Com a chave pública, leitura, alteração e apagamento são recusados; login de um proprietário testado em produção |
| S-2 — links do Airbnb públicos | ✅ **Corrigido** a 14/11 (migrações `20261114100000` + `20261114100100`; tabela privada `property_ical_feeds`) | `npm run check:exposure` sem falhas; cron de produção a ler as 37 casas pela tabela nova, 0 erros. **Falta, do lado do cliente:** gerar links novos no Airbnb |
| S-3 — ações sem permissões | ✅ **Corrigido** a 14/11. Todas as ações da lista verificam a função de quem chama; `scrapeAirbnbListing` só aceita links https do Airbnb. Também: `getPropertiesOptions`, `checkResendStatus` e `checkDatabaseStatus`. `logActivity` e o robô do iCal estavam **expostos** (ver S-3) e passaram para módulos `server-only` (`lib/audit-log.ts`, `lib/ical-sync.ts`) | Build local de produção, chamadas sem sessão: todas recusadas, sem chamadas à IA nem sincronizações. No manifesto do build, as 166 ações expostas foram revistas uma a uma. **Não testado localmente:** o caminho com sessão de admin (precisa de login) |
| L-1 — email errado para pagamentos com Link | ✅ **Corrigido** a 14/11: o email ao hóspede escolhe o modelo "pago" para qualquer método que não seja `wire` (`card`, `link`, e `stripe` quando a Stripe não diz o tipo) | A linha real de `reservation.ts` avaliada para os 4 métodos, sem base de dados nem emails: antes só `card` recebia "pago", agora `card`/`link`/`stripe` recebem "pago" e `wire` os dados da transferência. Não foi feito um pagamento real (produção) |
| L-5 — limpeza do iCal apaga bloqueios de um feed falhado | ✅ **Corrigido** a 14/11: só limpa quando todos os links foram lidos | Código revisto e testado em produção |
| S-14 — qualquer pessoa escreve em `visitor_logs` | ✅ **Corrigido** a 14/11 (migração `20261114180000`): política pública de INSERT apagada e INSERT revogado a `anon`/`authenticated` | No dashboard: `anon`/`authenticated` sem INSERT, `service_role` com INSERT, só a política de leitura dos admins. Com a chave pública, a inserção dá `42501 permission denied` (antes passava). O proxy continua a gravar visitas (visita real às 23:33). `check:exposure` sem falhas |
| S-4 — reserva pública abusável | ✅ **Corrigido** a 14/11: `finalizeBooking` deixou de ser público (`lib/booking-finalize.ts`); campos escapados nos emails; referência só no formato do site; limites de 3/email/dia, 5/hora e 15/dia no site para transferências | Manifesto do build sem `finalizeBooking`; templates com HTML injetado: 0 tags passam (antes 3–6); referência e limites testados localmente. Sem captcha; expiração das transferências fica no L-8 |
| L-2 — valor cobrado diferente do mostrado | ✅ **Corrigido** a 15/11: o checkout cria um PaymentIntent novo sempre que o cupão ou os dados mudam, e nunca mostra um antigo | Testado no checkout local com as chaves de **teste** da Stripe (sem pagar, sem reservas): Cartão no passo 3 criou o PaymentIntent 1 (email A); voltar ao passo 3 sem mudanças não criou outro; mudar o email no passo 1 e voltar criou o PaymentIntent 2 com o email B, e é esse que o formulário usa. Bloqueio de 15 min em datas de 2027 libertado no fim; 0 reservas criadas. `tsc`, build, lint igual |
| L-3 — reserva dupla | ✅ **Corrigido** a 15/11: verificação final antes de gravar; pago em datas ocupadas fica "Em revisão" com alerta à equipa; regra `EXCLUDE` `reservations_no_overlap` aplicada (migração `20261115090000`, depois do deploy do código) | Regra confirmada no SQL Editor; site, leituras de reservas e `check:exposure` OK depois da regra. 10 cenários simulados + leituras reais; `tsc`, build, lint igual. Nenhuma reserva criada |
| L-4 — dados perdidos nos pagamentos com cartão | ✅ **Corrigido** a 15/11: telefone com indicativo e nomes dos outros hóspedes passam pela metadata da Stripe | PaymentIntent de teste com `+44 …` e o nome do 2.º hóspede; pack/unpack testado (vazios, 20 máx., limite de 500 caracteres, dados estragados); `tsc`, build, lint igual. Nenhuma reserva criada |
| S-6 — XSS no blog | ✅ **Corrigido** a 15/11: HTML dos posts limpo ao gravar, ao carregar para o editor e ao mostrar (`lib/sanitize-blog-html.ts`) | Os 4 posts reais renderizados antes/depois: texto idêntico, mesmas tags/classes/estilos/links/SVG; 14 ataques conhecidos neutralizados; post aberto no browser local; `tsc`, build, lint igual; 0 vulnerabilidades nas dependências de produção |
| S-7 — links de convite | ✅ **Corrigido** a 15/11: o convite deixa de funcionar quando a password é definida ou quando é enviado um convite novo; até lá, 30 dias e tentativas ilimitadas | 8 cenários com tabela simulada (reutilizável antes, invalidado ao reenviar e ao definir a password, email sem maiúsculas e sem coringas, nada apagado, falha da BD não bloqueia a password); `tsc`, build, lint igual. Nenhuma conta real tocada |
| L-6 / L-7 — números do portal dos proprietários | ✅ **Corrigido** a 15/11: meses por ano, período do filtro aplicado, ocupação do período, receita líquida, cada estadia no mês do check-in, canceladas fora da exportação; filtro de ano até ao próximo ano (L-15) | Versão antiga vs nova com dados reais (só leitura): ocupação de 2026 0% → 16%, etiquetas certas, agosto €19 977 → €6 334; 12 relatórios de 2026: 485 linhas / €274 355 → 423 / €228 255 (cada estadia uma vez); `tsc`, build, lint igual ou melhor |
| S-13 + SEO-1/2/3/5/6/7/9 + hebraico | ✅ **Corrigido** a 15/11: sem `X-Powered-By`; páginas das casas e cartões no HTML do servidor; slug inválido = 404; hreflang só en/pt; links do blog com língua; rota antiga redireciona; metadados de privacidade/termos/contacto; `/he` → `/en` (308); textos das casas traduzidos para pt | Servidor local: redirecionamentos 308, sem cabeçalhos `Link`/`X-Powered-By`, canonicals certos, sitemap sem `he`, HTML das casas com conteúdo, 0 erros de hidratação; tradução verificada contra a cópia de segurança; `tsc`, build, lint igual ou melhor |
| SEO-10 — região e cache | ⏳ Região `dub1` feita a 15/11; cache/ISR das páginas estáticas por fazer | — |
| S-8 — código de reserva Stripe | ✅ **Corrigido** a 18/11: o código usa o fim aleatório do ID do pagamento (era o início, que é a hora); um código já usado por **outra** reserva passa a `-2`, `-3`… em vez de descartar a reserva | Simulação com tabela falsa, 11 cenários (colisão, duplicado nos dois caminhos da Stripe, código antigo, corridas, base de dados a falhar): nenhum pagamento perdido nem "sucesso" sem gravar. Nenhuma reserva criada |
| S-9 — bloqueio de 15 min | ⏳ Código feito a 18/11 (código de sessão aleatório de 32 caracteres; validação no servidor com a service role; sem códigos nos logs). **Falta aplicar** a migração `20261118100000_locked_dates_private.sql` | `check:exposure` mostra FAIL até a migração ser aplicada (89 linhas legíveis com a chave pública a 18/11) |
| L-11 / L-12 / L-13 / L-14 | ✅ **Corrigido** a 18/11: taxa 0 no checkout; desconto arredondado ao euro também no servidor e na API de parceiros; datas no fuso de quem vê; valores com vírgula na importação do Airbnb; último dia dos bloqueios manuais igual no admin e no site | Fusos de São Paulo/Nova Iorque/Lisboa/Jerusalém comparados; the-golde-dune (8 noites, 2 adultos): checkout €2 528 → €2 500 = valor cobrado; paridade da API de parceiros em 800 cenários; testes novos da importação. O ecrã de bloqueios do admin não foi aberto (precisa de login) |
| SEO-11 — palavras-chave e etiquetas | ✅ **Corrigido** a 15/11: títulos e descrições gerados com tipo e cidade; edifícios com texto próprio; H1 da página inicial com palavra-chave; `alt` descritivos (eram `[object Object]`); blog sem marca repetida e com ficha de artigo; sitemap com entradas pt; sem `meta keywords` | Servidor local: títulos/descrições en e pt, 0 `[object Object]`, um H1 por página, sitemap com 104 URLs, `BlogPosting` no HTML, 0 erros na consola; `tsc`, build, lint igual |

Ferramenta nova: `npm run check:exposure` (scripts/check-public-exposure.ts). Testa, só com a chave pública e só a ler, o que um visitante consegue ver. Deve ser corrida depois de cada alteração a regras, permissões ou colunas da base de dados.

## Top 10 — o que corrigir primeiro

| # | Problema | Área | Gravidade |
|---|---|---|---|
| 1 | Tabela `profiles` legível por qualquer visitante: 34 contas com email, telefone e função ✅ | Segurança | **Crítico** |
| 2 | Links privados dos calendários Airbnb (38) legíveis por qualquer visitante ✅ | Segurança | Alto |
| 3 | Ações do servidor do admin sem verificação de permissões (tradução em massa, iCal, scraping, cache) ✅ | Segurança | Alto |
| 4 | Quem paga com **Stripe Link** recebe o email "pague por transferência"; aconteceu numa reserva real a 12/10 ✅ | Lógica | Alto |
| 5 | Reserva pública sem limite de pedidos: bloqueia datas e envia emails com campos não escapados ✅ | Segurança | Alto |
| 6 | O valor cobrado pode ser diferente do mostrado: um PaymentIntent antigo é reutilizado depois de mudar o cupão | Lógica | Alto |
| 7 | O pagamento não volta a verificar a disponibilidade: risco de reserva dupla com bloqueio do Airbnb | Lógica | Alto |
| 8 | As páginas das casas chegam ao Google sem conteúdo (são carregadas no browser) ✅ | SEO | Alto |
| 9 | Google Analytics com o ID de exemplo `G-XXXXXXXXXX`: **não está a recolher dados** ✅ | SEO | Alto (fácil) |
| 10 | Não há base de dados de testes: tudo se testa em produção; 33 scripts escrevem na BD real | Código | Alto |

---

## 1. Segurança

### Crítico

**S-1. Tabela `profiles` pública ✅**
- **Onde:** `supabase/migrations/20260201_fix_rbac_recursion.sql:16-18`. A política `"Service role has full access" FOR ALL USING (true) WITH CHECK (true)` não tem `TO service_role`, por isso aplica-se a todos.
- **Confirmado com a chave pública:** 34 linhas legíveis, incluindo `email`, `phone`, `role` e `full_name`. Estão lá 1 super_admin, 2 admins, 3 editores e 28 proprietários. Como `properties.owner_id` também é público, dá para ligar cada casa ao contacto do proprietário.
- **Escrita (não testada, por ser proibido escrever):** a mesma política permite INSERT/DELETE. É provável que uma conta autenticada consiga apagar o próprio perfil e recriá-lo com `role='super_admin'`, porque o trigger anti-escalada só corre em UPDATE.
- **Correção:**
  - Apagar a política.
  - Criar políticas "ler o próprio perfil" e "a equipa lê todos" (com uma função `SECURITY DEFINER`, para evitar a recursão que motivou aquela migração).
  - Estender o trigger a INSERT.
  - Revogar escrita ao `anon`.
- **Implicações:** são dados pessoais expostos. Vale a pena o cliente avaliar a obrigação de registo/notificação ao abrigo do RGPD; os logs da Supabase podem mostrar se houve acessos.

### Alto

**S-2. Links privados do Airbnb expostos ✅**
- Os 38 `ical_import_urls` com token (`t=`/`s=`) são legíveis com a chave pública, e `last_sync_error` também.
- **Correção:** retirar estas colunas (e `owner_id`) da leitura pública, e depois **pedir ao cliente para regenerar os links de exportação no Airbnb**.

**S-3. Ações do servidor sem verificação de permissões ✅**

Confirmei que estas não têm nenhuma verificação no código:

| Ação | O que permite |
|---|---|
| `translateAllProperties` (`app/actions/translate.ts:240`) | Reescreve as traduções de todas as casas com IA, usando a service role, e gasta créditos |
| `translatePropertyFields` / `translateText` (`translate.ts:107`, `:9`) | Gastar créditos de IA |
| `scrapeAirbnbListing` (`app/actions/airbnb.ts:14`) | Pôr o servidor a ir buscar qualquer URL (SSRF) |
| `syncPropertyICal` / `syncAllPropertiesICal` (`app/actions/ical.ts:94`, `:394`) | Disparar sincronizações |
| `flushGlobalCache` (`app/actions/settings.ts:145`) | Limpar a cache do site inteiro |
| `finishReservationEarly` (`admin-reservation-actions.ts:161`) | Qualquer utilizador autenticado, incluindo proprietários, pode encurtar qualquer reserva e libertar noites |

- **Exposição:** não aparecem nos ficheiros JS públicos, só nos do admin, mas um ID de ação é um endpoint POST público.
- ~~`finalizeBooking` e `logActivity` estão exportadas sem verificação; hoje nenhum componente as importa, mas isso é frágil.~~ **Corrigido a 14/11:** estava errado. Quando um componente cliente importa **uma** função de um ficheiro `'use server'`, o Next expõe **todas** as funções desse ficheiro. Confirmado no manifesto do build (`.next/server/server-reference-manifest.json`):
  - `logActivity` estava exposta, porque `audit.ts` é importado por `ActivityTimeline` e `NotificationsPopover`. Qualquer pessoa podia escrever no registo de atividade com a service role, com qualquer autor, detalhe e gravidade, incluindo alertas `CRITICAL` nas notificações do admin. Passou para `lib/audit-log.ts`.
  - `syncOverduePropertiesICal`, a ronda do robô, estava exposta, porque `ical.ts` é importado pelas páginas de propriedades e de settings. Qualquer pessoa podia disparar rondas de sincronização. O motor passou para `lib/ical-sync.ts`, e o robô só é acessível pelo cron, que exige `CRON_SECRET`.
  - `finalizeBooking` também estava exposta (o checkout importa `reservation.ts`): ver S-4, corrigido a 14/11.
- **Correção aplicada:** `requireRole()` (`lib/auth/require-role.ts`) no topo de cada ação, e as funções internas em módulos `server-only`. Regra nova no CLAUDE.md.

**S-4. Reserva pública abusável ✅ (parcialmente)**
- `processReservation` (`app/actions/reservation.ts:73`) é chamada pelo checkout público. A única proteção é um honeypot, sem limite de pedidos.
- Cada chamada cria uma reserva `pending`, que **bloqueia as datas no site e é exportada para o Airbnb**, e envia email para o endereço indicado.
- Nos templates das reservas (`lib/email-templates.ts:67`, `:155+`), os campos `reference_id` (vem do browser), `extra_guests` e a hora de chegada **não são escapados** (os formulários de contacto são). Isto permite enviar emails com o domínio Lovely Memories e conteúdo injetado, por exemplo um IBAN falso.
- **Correção:**
  - Escapar todos os campos.
  - Gerar a referência no servidor.
  - Limitar pedidos por IP e por email.
  - Expirar reservas por transferência não pagas.
  - Opcionalmente, um captcha.
- **Mais grave, encontrado a 14/11:** `finalizeBooking` era um endpoint público, porque o checkout importa `reservation.ts` e o Next expõe todas as funções do ficheiro (confirmado no manifesto do build). Grava com a service role e confia em tudo o que recebe: qualquer pessoa podia criar uma reserva **"confirmada" sem pagar**, sem verificar disponibilidade, com qualquer preço, e o servidor enviava o email de "pagamento confirmado".
- **Estado:** ✅ corrigido a 14/11, menos o captcha e a expiração das transferências (L-8):
  - `finalizeBooking` passou para `lib/booking-finalize.ts` (`server-only`). No manifesto, `reservation.ts` só expõe `processReservation` e `deleteReservation`.
  - Todos os campos vindos do hóspede são escapados nos emails de reserva (referência, datas, hóspedes adicionais, hora de chegada, método de pagamento, nome da casa), e também `plan`/`numProperties` no email de leads. Testado com HTML injetado: antes passavam 3 a 6 tags por email, agora 0.
  - Referência: em vez de a gerar sempre no servidor, aceita-se o código do checkout só se tiver o formato exato do site (6 caracteres do alfabeto de `lib/booking-session.ts`), porque o checkout mostra `LM-<código>` nos dados da transferência **antes** de o hóspede confirmar. Qualquer outro valor é substituído por um código do servidor (`lib/wire-booking-guards.ts`).
  - Limites, contados na tabela `reservations` (valem entre instâncias da Vercel): 3 transferências por email em 24 h, 5 por hora e 15 por dia no site todo. O limite por IP ficou de fora: precisava de uma coluna nova, e o limite do site todo trava melhor um script que mude de IP. Até 14/11 nunca tinha havido uma reserva por transferência (as 6 do site foram cartão/Link), por isso os limites não tocam em hóspedes reais. Ao atingir um limite, o hóspede vê `Checkout.errorTooManyBookings` (pagar com cartão ou contactar), e o cartão continua a funcionar.
  - Não testado com uma reserva real (produção: gravaria e enviaria emails). Testados localmente os templates, a referência e os limites (com uma base de dados simulada e uma leitura real só de `SELECT`).

### Médio
- **S-5. Políticas da BD mais largas do que a app:**
  - Os editores têm `FOR ALL` em `reservations` e nos posts do blog e do Instagram.
  - Qualquer utilizador autenticado pode alterar `concierge_services`.
- **S-6. XSS no blog:** `blog/[slug]/page.tsx:141` faz `parse(post.content)` sem sanitização, e as tags `<script>` são renderizadas no servidor. Um editor pode roubar a sessão de um admin. **Correção:** DOMPurify / sanitize-html.
  - **Estado:** ✅ corrigido a 15/11. Havia dois sítios: a página pública (`parse(post.content)`) e o editor do backoffice (`innerHTML = post.content`, onde um `<img onerror>` corre ao abrir o post). `lib/sanitize-blog-html.ts` (`sanitize-html` 2.18.1, versão fixa) limpa o HTML ao gravar (`upsertBlogPost`), ao carregar para o editor (`getBlogPosts`) e ao mostrar. Mantém o que dá aspeto (classes, estilos, `data-*`, ícones SVG) e retira o que executa (`<script>`, `<style>`, iframes, formulários, `on*`, links `javascript:`/`data:`). Os 4 posts publicados ficam com o mesmo texto e a mesma estrutura (só sai o `contenteditable` colado de outro editor, que deixava editar o texto na página).
- **S-7. Links de convite:** valem 30 dias e nunca são revogados depois de definida a password (`app/actions/auth.ts:159-245`).
  - **Estado:** ✅ corrigido a 15/11. Cada uso de um convite inicia sessão sem password, e o link servia 30 dias, quantas vezes se quisesse, mesmo depois de a password estar definida. Agora `revokeInvites` (`lib/invite-tokens.ts`, agora `server-only`) termina os convites da pessoa (passa `expires_at` para agora; nada é apagado) quando a password é definida (página set-password, mudança própria, admin define a password do proprietário ou da equipa) e quando é enviado um convite novo. Até lá fica igual: 30 dias e tentativas ilimitadas, para não voltar o problema antigo dos links que expiravam em horas (resolvido a 29/06 e 09/10).
  - Nota: os links que "expiravam ao fim de umas horas" eram os convites antigos, que usavam o link da Supabase; desde 29/06 há 29 convites enviados, 17 usados e 12 expirados aos 30 dias sem uso. O único link curto que resta é o de "esqueci-me da password" (token da Supabase; validade definida no painel em Authentication → Email → Email OTP Expiration).
- **S-14. Qualquer pessoa pode escrever em `visitor_logs`** (encontrado a 14/11):
  - A política `"Anyone can insert visitor logs"` (`20260205125000_visitor_analytics.sql`) dá `INSERT` `to public` com `with check (true)`. Com a chave pública dá para inserir visitas falsas, estragar as estatísticas e fazer crescer a base de dados, que no plano Free tem 500 MB.
  - O proxy escreve com a service role, por isso a política não faz falta.
  - **Correção:** uma migração que apaga a política e revoga `INSERT` a `anon`/`authenticated`.
  - **Confirmado em produção a 14/11:** com a chave pública, uma inserção feita para falhar passou pela política e só parou na regra NOT NULL de `path` (nada foi gravado). Nos últimos 30 dias não há sinais de visitas falsas: todas têm os campos que o proxy preenche, e os outros hosts são `localhost` de desenvolvimento.
  - **Estado:** ✅ corrigido a 14/11, migração `20261114180000_visitor_logs_no_public_insert.sql` aplicada no SQL Editor. A inserção com a chave pública dá agora `42501 permission denied`, e o proxy continua a gravar visitas.

### Baixo
- **S-8.** A referência Stripe usa só os primeiros 8 caracteres do ID do PaymentIntent. Uma colisão descartaria um pagamento em silêncio. Nota de 14/11: os 8 caracteres têm pouca variação na prática (as referências reais são todas `LM-3U????ED`), por isso o risco é maior do que parece.
  - **Estado:** ✅ corrigido a 18/11. Os primeiros 8 caracteres de um ID da Stripe são a hora e um pedaço fixo da conta (`3UBRPFED`, `3UBR1QED`…): dois pagamentos começados no mesmo segundo davam o mesmo código, e o segundo era tratado como duplicado e não ficava gravado. `lib/stripe-reference.ts` usa os últimos 8 (a parte aleatória), igual no webhook, na confirmação do browser e na página de confirmação. Em `finalizeBooking`, um código só conta como "já gravado" se a linha for a mesma reserva (casa, datas e email); se for outra, grava como `-2`, `-3`…; nunca devolve sucesso sem gravar (antes devolvia, num conflito do índice único). As reservas gravadas com o código antigo continuam a ser reconhecidas.
- **S-9.** Qualquer pessoa pode libertar o bloqueio de 15 minutos de outra (`locked_dates.session_id` é público).
  - **Estado:** ⏳ código feito a 18/11; falta aplicar a migração. Confirmado: com a chave pública liam-se 89 bloqueios com o código de sessão, que permite libertar, prolongar ou ficar com o bloqueio de outra pessoa e pagar por cima dele. A migração `20261118100000_locked_dates_private.sql` fecha a tabela (só o servidor lhe chega). O código de sessão passa a ser aleatório (32 caracteres; eram 7 de `Math.random`), `validatePropertyAvailability` usa a service role e os logs deixam de mostrar códigos de outras sessões. Também: o aviso "datas reservadas" do temporizador do checkout dava erro (um hook chamado dentro do clique) e o hóspede via "erro de ligação".
- **S-10.** Não há limite de tentativas de login nem MFA.
- **S-11.** O limite do formulário de contacto depende só de um cookie, e o log guarda o pedido completo, com email e telefone.
- **S-12.** O bucket `property-access` (fotos de acesso às casas) é público.
- **S-13.** O cabeçalho `X-Powered-By: Next.js` é enviado. Correção: `poweredByHeader: false`. ✅ Corrigido a 15/11.

### Já está bem
- Webhook da Stripe com assinatura; cron com `CRON_SECRET`; API de parceiros com chaves em hash, limite de pedidos e kill-switch.
- O preço, os extras e o cupão são recalculados no servidor.
- `reservations`, `coupons`, `visitor_logs`, `ai_*` e `system_settings` estão fechados ao público ✅.
- Não há segredos em `NEXT_PUBLIC_*` nem `.env` no git.
- HSTS, X-Frame-Options e nosniff estão ativos.

---

## 2. Lógica da aplicação

### Alto

**L-1. Email errado para quem paga com Stripe Link ✅**
- **Onde:** `app/actions/reservation.ts:387-389` envia o email de "pago" só quando `paymentMethod === 'card'`. Um pagamento com Link fica guardado como `'link'`.
- **Em produção:** há 2 reservas pagas com Link. A de **12/10/2026** está confirmada, e esse hóspede recebeu o email com os dados para transferência depois de já ter pago.
- **Correção:** enviar o email de "pago" sempre que o método não for `'wire'`.
- **Estado:** ✅ corrigido a 14/11 em `reservation.ts` (`paymentMethod !== 'wire'`). Também cobre o caso `stripe`, que os dois caminhos da Stripe usam quando não conseguem ler o tipo de pagamento.

**L-2. Valor cobrado diferente do mostrado**
- **Onde:** `checkout/page.tsx:586` só cria o PaymentIntent uma vez, e o `clientSecret` nunca é reposto.
- **Cenário:** o hóspede escolhe Cartão (€1.000), volta atrás, aplica um cupão de 10% e vê €930, mas é cobrado €1.000 e a reserva fica guardada sem o cupão.
- **Correção:** repor o `clientSecret` (ou atualizar o PaymentIntent) sempre que o cupão, os extras ou os dados mudem.
- **Estado:** ✅ corrigido a 15/11 em `checkout/page.tsx`. O PaymentIntent fica associado a uma chave com tudo o que `createPaymentIntent` usa (cupão, dados do hóspede, faturação, datas, hóspedes, extras, idioma). Um PaymentIntent de outra chave nunca é mostrado, e ao voltar ao passo 3 com Cartão escolhido cria-se um novo. Se a criação falhar, o antigo é descartado. Não houve mudança no servidor.

**L-3. Reserva dupla possível**
- `finalizeBooking` não volta a verificar a disponibilidade, e a BD não tem uma restrição contra sobreposições.
- **Cenário:** o cron importa um bloqueio do Airbnb entre a criação do pagamento e o pagamento.
- **Correção:** verificar de novo no fim (se houver conflito, marcar para revisão e alertar a equipa), e adicionar uma restrição `EXCLUDE` com `daterange`.
- **Estado:** ✅ corrigido a 15/11. Código em produção (`0ee311b`) e regra da base de dados aplicada a seguir no SQL Editor.
  - `lib/booking-conflict.ts`: verificação final mesmo antes de gravar (reservas ativas e bloqueios, incluindo os do Airbnb; os bloqueios de 15 min de outros hóspedes não contam).
  - `finalizeBooking`: transferência em datas ocupadas → recusada (`errorAlreadyBooked`), nada gravado nem enviado. Pagamento Stripe em datas ocupadas → gravado como `needs_review` ("Em revisão"), email de alerta ao info@ e email ao hóspede "pagamento recebido, estamos a confirmar as datas". O erro da regra da BD (23P01) segue o mesmo caminho; se for a mesma reserva gravada pelo outro caminho da Stripe, é tratado como duplicado.
  - Backoffice: "Em revisão" tem as ações de aprovar/rejeitar; confirmar ou reativar por cima de datas ocupadas é recusado com uma mensagem clara (resolve também o L-10). Cancelar uma reserva "Em revisão" envia o email de cancelamento, como numa confirmada.
  - Migração `20261115090000_reservations_no_overlap.sql`: `EXCLUDE` com `daterange(check_in, check_out, '[)')` por casa, só para `pending`/`confirmed` (as importações antigas do Airbnb, `completed`, têm 2 sobreposições em agosto e ficam de fora).
  - Testado sem nenhuma reserva: 10 cenários do `finalizeBooking` com base de dados e emails simulados; a verificação final com leituras reais (dentro de uma reserva, dia de troca, a própria reserva, bloqueios). Confirmado que o calendário do Airbnb não devolve as nossas reservas como bloqueios (sem falsos conflitos).

### Médio
- **L-4.** Nas reservas pagas com cartão perdem-se dados que as reservas por transferência guardam: o indicativo do telefone e os nomes dos outros hóspedes, que são necessários para o SEF.
  - **Estado:** ✅ corrigido a 15/11. Confirmado antes em produção: as 6 reservas pagas do site tinham o telefone sem indicativo e 0 hóspedes adicionais (com 2 a 4 pessoas). O checkout passa a enviar o telefone com indicativo e os nomes; `createPaymentIntent` aceita-os e guarda os nomes na metadata da Stripe (`eg`, JSON até 500 caracteres, `lib/booking-metadata.ts`); o webhook e `confirmStripePaymentIntent` reconstroem-nos. Testado com um PaymentIntent de teste (`ph=+44 …`, `eg=[nome]`), sem reservas. As reservas antigas não se recuperam (os dados nunca chegaram à Stripe).
- **L-5.** A limpeza do iCal apaga os bloqueios de um feed que falhou, se a casa tiver mais do que um URL (hoje todas têm só um, por isso ainda não acontece).
- **L-6.** Números errados no dashboard do proprietário (`owner-analytics.ts`):
  - os meses de anos diferentes são somados juntos;
  - com o filtro de ano, a ocupação dá sempre 0%;
  - a receita é bruta, com taxa turística e extras incluídos.
  - **Estado:** ✅ corrigido a 15/11. Meses agrupados por `yyyy-MM` (já não somam anos diferentes); o filtro de ano e de mês define o período (totais, atividade e ocupação), e a ocupação mede as noites dentro do período (antes media os 30 dias antes de 1 de janeiro). Receita **líquida**, por decisão do cliente (`lib/owner-revenue.ts`): no Airbnb o valor pago depois da comissão; no site o total sem taxa turística e extras. Cada estadia conta no mês do check-in. Comparado com dados reais (proprietário com 47 estadias): ano 2026 passou de 0% para 16% de ocupação e de etiquetas "2025" para 2026; agosto 2026 passou de €19 977 (ano inteiro) para €6 334; receita sem filtro €19 977 bruto → €16 559 líquido.
- **L-7.** Na exportação mensal do proprietário (`owner-export.ts`), as reservas canceladas contam, e uma estadia que atravessa dois meses aparece inteira nos dois.
  - **Estado:** ✅ corrigido a 15/11. Cada estadia aparece só no mês do check-in (decisão do cliente) e as canceladas ficam de fora; a coluna "Líquido" usa a mesma definição do painel. Nos 12 meses de 2026: antes 485 linhas / €274 355, agora 423 linhas / €228 255, exatamente as 423 estadias de 2026.
- **L-8.** As reservas por transferência ficam `pending` para sempre, a bloquear datas.
  - **Decisão (15/11):** fica como está, por decisão do cliente. Não há prazo nem expiração automática; as transferências pendentes continuam a ser aprovadas ou rejeitadas à mão no backoffice. (Até 15/11 nunca houve uma reserva por transferência; o limite do S-4 trava o volume de reservas falsas.)
- **L-9.** A taxa turística é cobrada a crianças dos 2 aos 16 anos. É preciso confirmar com o regulamento municipal, que normalmente isenta as crianças.
- **L-10.** É possível passar uma reserva de "cancelada" para "confirmada" sem verificar a disponibilidade. ✅ Corrigido a 15/11 com o L-3 (o backoffice recusa reativar por cima de datas ocupadas, e a regra da BD também).

### Baixo
- **L-11.** A fórmula de preço do browser é diferente da do servidor. Por exemplo, `city_tax_per_night || 2` faz uma taxa de 0 virar €2 no ecrã, e há uma casa com taxa 0.
  - **Estado:** ✅ corrigido a 18/11. A casa é a `the-golde-dune`: com 2 adultos e 8 noites o checkout mostrava €2 528 e cobrava €2 500. Também o desconto semanal/mensal: os ecrãs arredondavam ao euro e o servidor não (5% de €1 043 mostrava €52 e descontava €52,15); passou a ser arredondado ao euro no servidor e na API de parceiros (paridade verificada em 800 cenários). Fica uma diferença latente: o checkout não conhece os preços especiais por data (`custom_pricing`, hoje vazio) — resolve-se com o C-2.
- **L-12.** As datas aparecem um dia mais cedo no checkout para quem está a oeste de UTC.
  - **Estado:** ✅ corrigido a 18/11 no checkout, na fatura de confirmação (e no PDF) e na pesquisa, que **procurava disponibilidade no dia anterior** para quem está no Brasil ou nos EUA. Usa `parseDateLocal` (`lib/utils.ts`), que já servia a página das casas.
- **L-13.** `parseMoney` da importação do Airbnb: "120,50" passa a 12050.
  - **Estado:** ✅ corrigido a 18/11, com testes (`lib/__tests__/airbnb-money.test.ts`): aceita "120,50", "1.234,56", "1,234.56" e "1,234". As 431 estadias já importadas vinham com ponto decimal e não foram afetadas.
- **L-14.** O dia final dos bloqueios manuais é diferente no admin e no site.
  - **Estado:** ✅ corrigido a 18/11. `end_date` é o primeiro dia livre (como o check-out), que é como o site, as importações do iCal e a exportação para o Airbnb o leem. O ecrã de bloqueios do admin guarda agora o último dia escolhido + 1, mostra as noites ocupadas sem o dia de saída, e a verificação de sobreposição deixa começar um bloqueio no dia de saída de uma reserva e passa a contar as reservas pendentes. Não havia bloqueios manuais futuros, por isso nada mudou nos dados.
- **L-15.** O filtro de ano do proprietário está fixo em 2024–2026, por isso falta 2027. ✅ Corrigido a 15/11: do próximo ano até 2024.

### Já está bem
- Os pagamentos são recalculados no servidor.
- Há um índice único na referência, que evita reservas e emails duplicados entre o webhook e a confirmação manual.
- Estadias tratadas como `[check-in, check-out)`, por isso o mesmo dia de saída e entrada funciona.
- A importação do iCal e do CSV do Airbnb é defensiva.

---

## 3. SEO

### Alto

**SEO-1. Páginas das casas sem conteúdo no HTML ✅**
- **Onde:** `components/PropertyDetails.tsx` vai buscar os dados num `useEffect`. O HTML que o servidor envia tem só o menu e o rodapé, sem título, descrição, fotos nem preço.
- Um slug que não existe responde 200 com noindex, o que é um soft-404.
- **Correção:** ir buscar a casa no `page.tsx` do servidor e usar `notFound()`.
- **Estado:** ✅ corrigido a 15/11: a página de cada casa vai buscar os dados no servidor (`page.tsx`, com `cache` para não repetir a consulta) e passa-os ao `PropertyDetails`; um slug inexistente dá 404 real. Datas e hóspedes do URL lidos com `useSearchParams` (já no HTML do servidor). Verificado: título, subtítulo, descrição, fotos e preços no HTML; slug inválido → 404.

**SEO-2. Nenhum link rastreável para as casas**
- A homepage e a listagem carregam os cartões no browser, por isso o HTML tem 0 links para `/properties/`.
- **Estado:** ✅ corrigido a 15/11: homepage (5 em destaque escolhidas no servidor) e listagem recebem as casas do servidor; a listagem põe todos os cartões no HTML e o "Carregar mais" só mostra os escondidos. HTML da listagem: 0 → 19 links de casas + 4 de edifícios.

**SEO-3. hreflang contraditório**
- O next-intl envia um cabeçalho `Link:` com x-default diferente do HTML e do sitemap, e anuncia versões pt/he de posts que dão 404.
- **Correção:** `alternateLinks: false` em `i18n/routing.ts`.
- **Estado:** ✅ corrigido a 15/11: `alternateLinks: false` e o hebraico retirado (ver abaixo). Já não há cabeçalho `Link`; o hreflang vem só dos metadados (en, pt, x-default=/en) e do sitemap.

**SEO-4. Google Analytics desligado ✅**
- O site carrega `G-XXXXXXXXXX` porque `NEXT_PUBLIC_GA_ID` não está definido em produção.
- **Correção:** definir a variável na Vercel. Leva 5 minutos e o cliente passa a ter dados.

### Médio
- **SEO-5.** Os links do blog não levam a língua: em `/pt/blog`, um link redireciona e acaba em 404. Correção: usar o `Link` de `@/i18n/routing`. ✅ Corrigido a 15/11 (`Link` de `@/i18n/routing` no cartão e no post).
- **SEO-6.** A rota antiga `/[locale]/property/[slug]` dá **500** (já existia antes do upgrade ✅). Correção: apagar a rota e redirecionar permanentemente para `/properties/[slug]`. ✅ Corrigido a 15/11: rota apagada; `/property/:slug` e `/:locale/property/:slug` redirecionam (308) para `/:locale/properties/:slug`.
- **SEO-7.** As páginas pt/he das casas são cópias em inglês: título e descrição iguais e texto fixo em inglês. São cerca de 90 páginas quase duplicadas. ✅ Corrigido a 15/11: o hebraico foi abandonado (o cliente desistiu da língua); 39 de 41 casas não tinham texto em português, e foram traduzidos para português europeu (856 valores: 34 subtítulos, 36 descrições, 729 comodidades, quartos, locais…), só onde o pt estava vazio; inglês intacto (verificado coluna a coluna contra a cópia `supabase/backups/2026-11-15-properties-before-pt.json`). Os títulos são nomes próprios e ficam iguais. A frase final da meta description passou a ser traduzida.
- **SEO-8.** O preloader de ecrã inteiro atrasa o LCP em mais de 1 s e acrescenta um segundo H1 a todas as páginas. ⏳ Parcial a 15/11: o "Lovely Memories" do preloader deixou de ser um H1 (ver SEO-11); o atraso no LCP continua.
- **SEO-9.** Privacidade e Termos não têm metadados próprios; `/contact` não tem canonical. ✅ Corrigido a 15/11: privacidade e termos com título, descrição, canonical e hreflang (layouts no servidor); contacto com canonical e hreflang.
- **SEO-10.** Todas as páginas respondem com `no-store`, e as funções correm nos EUA (`iad1`). Correção: região UE e ISR nas páginas estáticas. ⏳ Parcial a 15/11: funções na Vercel em `dub1` (Dublin, ao lado da Supabase em eu-west-1). O cache/ISR das páginas estáticas fica por fazer: o layout lê a sessão e o next-intl não usa `setRequestLocale`, por isso todas as páginas são dinâmicas.
- **SEO-11.** Palavras-chave e etiquetas (achado de 15/11, ao rever as 54 páginas do sitemap em produção). Os títulos das casas não diziam a cidade e usavam abreviaturas de anúncio ("Luxe, Central 1 BDR"); 34 de 54 títulos passavam dos 60 caracteres e eram cortados; os 4 edifícios tinham a mesma descrição; o H1 da página inicial era o slogan, sem dizer o quê nem onde; **todas as fotos da listagem e dos edifícios tinham `alt="[object Object]"`**; o blog tinha a marca repetida no título, um artigo sem descrição e nenhuma ficha de artigo; as páginas pt só apareciam no sitemap como alternativas das en; havia `meta keywords` (ignorada pelo Google). ✅ Corrigido a 15/11:
  - `lib/property-seo.ts` gera título, descrição e texto das fotos a partir dos dados de cada casa: "The Charming — 1-Bedroom Apartment in Porto" / "Apartamento T1 no Porto". O tipo vem do subtítulo ou do nome (estúdio, duplex, loft…), e o número de quartos vem do subtítulo antes da coluna `bedrooms`, porque duas casas têm a coluna errada (ver abaixo).
  - Se o título com a marca passar dos 60 caracteres, a marca sai (`brandedTitle` em `lib/seo.ts`).
  - Edifícios: título e descrição próprios, com o número de apartamentos, a rua e a capacidade.
  - Página inicial: o H1 passa a ser a frase de cima, com o texto novo "Alojamento de luxo no Porto, Gaia e Algarve"; o slogan fica igual mas como parágrafo. O H2 e os H3 repetidos da versão de computador ficaram com `role="heading"`.
  - `alt` descritivos em todas as fotos de casas, edifícios e na foto principal.
  - Blog: título sem a marca repetida, descrição tirada do texto quando falta, ficha `BlogPosting`.
  - Sitemap com uma entrada por língua (104 URLs).
  - `meta keywords` removida.
  - Verificado no servidor local: títulos e descrições em en/pt, 0 `[object Object]`, um H1 por página, sitemap e ficha do blog; `tsc`, build, lint igual.
  - **Dados a rever pela equipa no backoffice:**
    - `the-burgundy` e `belomonte-penthouse` dizem 2 quartos no subtítulo, mas `bedrooms` = 1;
    - `apartment` tem "Lovely Memories |" no nome;
    - `the-terraced-loft` tem o nome pt "Terraço no Porto" e o subtítulo pt "Lindo e maravilhoso";
    - a descrição de `the-alluring` começa com "The Harmonious";
    - a de `belomonte-penthouse` começa com "nesStep";
    - os títulos dos artigos do blog levam "| Lovely Memories".

### Baixo
- Falta JSON-LD por casa, de breadcrumbs e de posts.
- `alt="[object Object]"` nas páginas dos edifícios.
- O `lastmod` do sitemap não é útil.
- Há títulos com a marca repetida.
- O H1 da homepage fica "PPOORRTTOO" por causa da animação.
- O seletor de língua não oferece hebraico.
- `/en/maintenance` é indexável.

### Já está bem
- robots.txt e sitemap estão bem.
- Canonicals absolutos, com www e na língua certa; `lang` e `dir="rtl"` corretos.
- As mockups estão em noindex.
- Os URLs maus devolvem 404 real.
- A imagem principal é WebP otimizado.
- O JSON-LD usa o domínio certo.

---

## 4. Código e boas práticas

**Veredicto:** a plataforma foi construída depressa e em largura. O trabalho recente (API de parceiros, correções do iCal) é sólido, mas falta uma rede de segurança: não há base de dados de testes, quase não há testes automáticos e não há tipos da BD.

### Alto
- **C-1. Não há staging.** O `.env.local` aponta para a BD de produção. Há 93 scripts em `scripts/`, dos quais 33 escrevem na BD real sem dry-run (por exemplo `cleanup-overlaps.ts`, `seed_test_data.js`), e `test-security.ts` cria reservas reais.
- **C-2. A fórmula de preço existe em 6 sítios** (`lib/pricing.ts`, partner API, `lib/booking-pricing.ts`, checkout, `BookingCard`, `BookingSidebar`), e não coincidem (ver L-11).
- **C-3. Sem tipos da BD:** `supabase/types.ts` está vazio. Há 418 `any` e 58 `select('*')`.
- **C-4. Validação de input:** só 6 das 168 ações validam com zod.
- **C-5. Sem monitorização de erros** (nada como o Sentry) e sem `error.tsx`, `global-error.tsx` nem `not-found.tsx`.
- **C-6. i18n:**
  - O `he.json` não tem 1080 chaves, e não há fallback para inglês, por isso os utilizadores em hebraico veem chaves cruas.
  - Os 105 `t('x') || 'fallback'` nunca funcionam.

### Médio
- **C-7.** Há 59 clientes Supabase criados à mão, com dois estilos de cookies, e cerca de 8 helpers de autenticação diferentes.
- **C-8. Ficheiros enormes:**

  | Ficheiro | Linhas | Nota |
  |---|---|---|
  | `checkout/page.tsx` | 1781 | |
  | `admin/settings/page.tsx` | 1390 | |
  | `admin/reservations/page.tsx` | 1185 | carrega todas as reservas sem paginação; limite silencioso de 1000 |

- **C-9.** As mensagens de erro misturam três formatos (`{success}`, `{ok}` e `throw`), e 47 estão fixas em português.
- **C-10.** As migrações não se conseguem reaplicar: falta a base, e há 19 ficheiros com a mesma versão.

### Baixo
- **Lixo no repositório:**
  - Na raiz: `tmp_*.js`, `debug-owner.log` (tem um UUID de utilizador), `app/page-v1.tsx`, `scratch/`.
  - `legacy-archive/` ocupa 122 MB, não é importada por nada e é enviada em cada deploy.
  - `scripts/properties_dump.json` está no git.
  - O `package.json` chama-se "temp-app".
- **CLAUDE.md desatualizado:** as pastas `temp-app/` e `concierge/` já não existem.

---

## Plano de correção proposto

**Onda 0 — urgente (esta semana)**
1. S-1: política da tabela `profiles` (migração SQL, aplicada à mão no dashboard da Supabase, verificada a seguir com a chave pública).
2. S-2: colunas privadas de `properties`, e depois o cliente regenera os links de exportação no Airbnb.
3. S-3: `requireRole()` em todas as ações do admin. ✅ Feito a 14/11.
4. L-1: email certo para pagamentos com Link. ✅ Feito a 14/11.
5. S-4: escapar os templates de reserva, gerar a referência no servidor e limitar pedidos. ✅ Feito a 14/11 (e `finalizeBooking` deixou de ser público). Sem captcha; expiração fica no L-8.
6. SEO-4: definir `NEXT_PUBLIC_GA_ID` na Vercel (o cliente fornece o ID).

**Onda 1 — integridade das reservas**
- L-2: PaymentIntent desatualizado.
- L-3: verificar de novo no fim e restrição na BD.
- L-4: dados perdidos nos pagamentos com cartão.
- ~~L-8: expirar transferências não pagas.~~ Fica como está (decisão do cliente, 15/11).
- S-6: sanitizar o blog. ✅ Feito a 15/11.
- S-7: revogar convites. ✅ Feito a 15/11.
- L-6 e L-7: números dos proprietários. ✅ Feito a 15/11.

**Onda 2 — SEO**
- SEO-1/2: páginas das casas e cartões renderizados no servidor.
- SEO-3: hreflang.
- SEO-5: links do blog.
- SEO-6: apagar a rota antiga e redirecionar.
- SEO-8: preloader.
- SEO-9: metadados.
- SEO-10: região UE.

**Onda 3 — base técnica (antes de crescer)**
- C-1: projeto Supabase de staging e guarda nos scripts.
- C-2: um só módulo de preços.
- Testes mínimos aos 5 fluxos críticos.
- C-3: tipos da BD.
- C-5: monitorização de erros.
- C-6: fallback i18n.
- Limpeza do repositório.

A seguir vêm a **Fase 2 das dependências** (Supabase, Stripe, UI) e a **área de vendas**.
