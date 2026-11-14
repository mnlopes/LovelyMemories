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
- `finalizeBooking` e `logActivity` estão exportadas sem verificação; hoje nenhum componente as importa, mas isso é frágil.
- **Correção:** um helper `requireRole()` no topo de cada ação, e as funções internas passam para módulos `server-only`.

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

### Médio
- **S-5. Políticas da BD mais largas do que a app:**
  - Os editores têm `FOR ALL` em `reservations` e nos posts do blog e do Instagram.
  - Qualquer utilizador autenticado pode alterar `concierge_services`.
- **S-6. XSS no blog:** `blog/[slug]/page.tsx:141` faz `parse(post.content)` sem sanitização, e as tags `<script>` são renderizadas no servidor. Um editor pode roubar a sessão de um admin. **Correção:** DOMPurify / sanitize-html.
- **S-7. Links de convite:** valem 30 dias e nunca são revogados depois de definida a password (`app/actions/auth.ts:159-245`).

### Baixo
- **S-8.** A referência Stripe usa só os primeiros 8 caracteres do ID do PaymentIntent. Uma colisão descartaria um pagamento em silêncio.
- **S-9.** Qualquer pessoa pode libertar o bloqueio de 15 minutos de outra (`locked_dates.session_id` é público).
- **S-10.** Não há limite de tentativas de login nem MFA.
- **S-11.** O limite do formulário de contacto depende só de um cookie, e o log guarda o pedido completo, com email e telefone.
- **S-12.** O bucket `property-access` (fotos de acesso às casas) é público.
- **S-13.** O cabeçalho `X-Powered-By: Next.js` é enviado. Correção: `poweredByHeader: false`.

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

**L-2. Valor cobrado diferente do mostrado**
- **Onde:** `checkout/page.tsx:586` só cria o PaymentIntent uma vez, e o `clientSecret` nunca é reposto.
- **Cenário:** o hóspede escolhe Cartão (€1.000), volta atrás, aplica um cupão de 10% e vê €930, mas é cobrado €1.000 e a reserva fica guardada sem o cupão.
- **Correção:** repor o `clientSecret` (ou atualizar o PaymentIntent) sempre que o cupão, os extras ou os dados mudem.

**L-3. Reserva dupla possível**
- `finalizeBooking` não volta a verificar a disponibilidade, e a BD não tem uma restrição contra sobreposições.
- **Cenário:** o cron importa um bloqueio do Airbnb entre a criação do pagamento e o pagamento.
- **Correção:** verificar de novo no fim (se houver conflito, marcar para revisão e alertar a equipa), e adicionar uma restrição `EXCLUDE` com `daterange`.

### Médio
- **L-4.** Nas reservas pagas com cartão perdem-se dados que as reservas por transferência guardam: o indicativo do telefone e os nomes dos outros hóspedes, que são necessários para o SEF.
- **L-5.** A limpeza do iCal apaga os bloqueios de um feed que falhou, se a casa tiver mais do que um URL (hoje todas têm só um, por isso ainda não acontece).
- **L-6.** Números errados no dashboard do proprietário (`owner-analytics.ts`):
  - os meses de anos diferentes são somados juntos;
  - com o filtro de ano, a ocupação dá sempre 0%;
  - a receita é bruta, com taxa turística e extras incluídos.
- **L-7.** Na exportação mensal do proprietário (`owner-export.ts`), as reservas canceladas contam, e uma estadia que atravessa dois meses aparece inteira nos dois.
- **L-8.** As reservas por transferência ficam `pending` para sempre, a bloquear datas.
- **L-9.** A taxa turística é cobrada a crianças dos 2 aos 16 anos. É preciso confirmar com o regulamento municipal, que normalmente isenta as crianças.
- **L-10.** É possível passar uma reserva de "cancelada" para "confirmada" sem verificar a disponibilidade.

### Baixo
- **L-11.** A fórmula de preço do browser é diferente da do servidor. Por exemplo, `city_tax_per_night || 2` faz uma taxa de 0 virar €2 no ecrã, e há uma casa com taxa 0.
- **L-12.** As datas aparecem um dia mais cedo no checkout para quem está a oeste de UTC.
- **L-13.** `parseMoney` da importação do Airbnb: "120,50" passa a 12050.
- **L-14.** O dia final dos bloqueios manuais é diferente no admin e no site.
- **L-15.** O filtro de ano do proprietário está fixo em 2024–2026, por isso falta 2027.

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

**SEO-2. Nenhum link rastreável para as casas**
- A homepage e a listagem carregam os cartões no browser, por isso o HTML tem 0 links para `/properties/`.

**SEO-3. hreflang contraditório**
- O next-intl envia um cabeçalho `Link:` com x-default diferente do HTML e do sitemap, e anuncia versões pt/he de posts que dão 404.
- **Correção:** `alternateLinks: false` em `i18n/routing.ts`.

**SEO-4. Google Analytics desligado ✅**
- O site carrega `G-XXXXXXXXXX` porque `NEXT_PUBLIC_GA_ID` não está definido em produção.
- **Correção:** definir a variável na Vercel. Leva 5 minutos e o cliente passa a ter dados.

### Médio
- **SEO-5.** Os links do blog não levam a língua: em `/pt/blog`, um link redireciona e acaba em 404. Correção: usar o `Link` de `@/i18n/routing`.
- **SEO-6.** A rota antiga `/[locale]/property/[slug]` dá **500** (já existia antes do upgrade ✅). Correção: apagar a rota e redirecionar permanentemente para `/properties/[slug]`.
- **SEO-7.** As páginas pt/he das casas são cópias em inglês: título e descrição iguais e texto fixo em inglês. São cerca de 90 páginas quase duplicadas.
- **SEO-8.** O preloader de ecrã inteiro atrasa o LCP em mais de 1 s e acrescenta um segundo H1 a todas as páginas.
- **SEO-9.** Privacidade e Termos não têm metadados próprios; `/contact` não tem canonical.
- **SEO-10.** Todas as páginas respondem com `no-store`, e as funções correm nos EUA (`iad1`). Correção: região UE e ISR nas páginas estáticas.

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
3. S-3: `requireRole()` em todas as ações do admin.
4. L-1: email certo para pagamentos com Link.
5. S-4: escapar os templates de reserva, gerar a referência no servidor e limitar pedidos.
6. SEO-4: definir `NEXT_PUBLIC_GA_ID` na Vercel (o cliente fornece o ID).

**Onda 1 — integridade das reservas**
- L-2: PaymentIntent desatualizado.
- L-3: verificar de novo no fim e restrição na BD.
- L-4: dados perdidos nos pagamentos com cartão.
- L-8: expirar transferências não pagas.
- S-6: sanitizar o blog.
- S-7: revogar convites.
- L-6 e L-7: números dos proprietários.

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
