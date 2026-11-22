# Imóveis à venda (Opção A) — desenho

**Data:** 2026-11-20
**Estado:** para aprovação do Marcelo (revisto por um revisor a 2026-11-20; as decisões tomadas depois da revisão estão marcadas "Decisão do Claude")
**Ponto de partida:** os ecrãs da Opção A em `/mockups-propertysell/a` (catálogo, página do imóvel, editor no backoffice), revistos a 2026-11-18/20.

## Intenção e porquê

A Lovely Memories quer pôr casas à venda no próprio site: casas que já gere como alojamento local (com historial de reservas que ajuda a vender) e casas de fora. Quem compra encontra-as num separador próprio, vê a ficha completa e pede informação ou uma visita. O pedido chega à equipa **por email**; não há caixa de pedidos no backoffice. A equipa cria e gere os anúncios no backoffice, com a mesma qualidade e facilidade do resto da plataforma.

O ponto forte da Lovely, e o que distingue estes anúncios de um portal imobiliário, é mostrar o rendimento real das casas que já gere (receita e ocupação dos últimos 12 meses, tirados das reservas).

## Objetivos (Fase 1)

1. Separador público "Imóveis à venda" com catálogo filtrável e página de cada imóvel, em pt e en, rápido e bem posicionado no Google.
2. Formulário de contacto por imóvel ("Pedir informação" / "Marcar visita") que envia email à equipa e confirmação ao comprador.
3. Backoffice para criar, editar, publicar e marcar o estado dos anúncios, com ligação opcional a uma casa gerida (copia os dados ao ligar) e resumo de rendimento automático.

## Não-objetivos (ficam de fora da Fase 1)

- Caixa de pedidos / CRM no backoffice (o contacto é só por email).
- Favoritos, contas de comprador, alertas de novos imóveis.
- Destaque na página inicial (fica para depois; o campo pode existir mas não é usado).
- Tradução automática com IA no editor (fica para depois).
- Avaliação dos hóspedes no resumo de rendimento (não existe na base de dados).
- Língua hebraica (abandonada no site).
- Tudo o que é da Opção B (mapa, calculadora de rendimento, visitas marcadas como estadias, pipeline de vendas).

## Anti-objetivos (seria um falhanço mesmo a funcionar)

- Uma casa à venda aparecer como reservável, na pesquisa de estadias, no iCal, na API de parceiros ou no portal dos proprietários.
- Dados privados acessíveis com a chave pública (rascunhos, morada exata, quem criou) — ver `npm run check:exposure`.
- Números de rendimento errados ou contados a dobrar num anúncio publicado.
- Anúncio publicado sem classe energética (obrigatória por lei nos anúncios de venda).
- Emails reais disparados durante testes, ou reservas criadas (trabalhamos contra a base de dados de produção).
- Dados pessoais dos compradores nos registos do servidor (o mesmo problema do S-11).

## Restrições

- **Uma só base de dados, a de produção.** Não há staging. As migrações são ficheiros em `supabase/migrations/` aplicados à mão no SQL Editor; uma migração só aditiva (como esta) aplica-se antes do deploy do código que a usa, e uma que retira acessos ou colunas aplica-se depois. Testes só com leituras, simulações ou dados de teste apagados no fim; nunca emails reais (ver "Testes").
- **Next.js 16 App Router, next-intl (en, pt)**, `defaultLocale` en. Textos novos de interface nas duas línguas (`messages/en.json` e `pt.json`, chaves em paridade). Usar `Link`/`redirect`/`useRouter` de `@/i18n/routing`.
- **Ações do servidor são endpoints públicos:** cada ação privilegiada começa com `requireRole()`; helpers que usam a service role e confiam nos argumentos vivem em módulos `server-only` em `lib/`, nunca em `app/actions/` (regra do `CLAUDE.md`).
- **Permissões do backoffice:** sistema de módulos (`lib/permission-defaults.ts`, tabela `role_permissions`, `guardModule` em `layout.tsx`, `AdminSidebar.tsx` e `AdminBottomNav.tsx`). Manter guarda do servidor e menu em sincronia.
- **Imagens:** hosts do `next/image` estão na lista de `next.config.ts` (Supabase storage já está).
- **SEO:** seguir o padrão das páginas das casas (`lib/seo.ts` `buildPageMetadata`, `clampDescription`, `brandedTitle`; JSON-LD como em `blog/[slug]/page.tsx`; sitemap com uma entrada por língua). Sem `meta keywords`.
- **Repositório público** no GitHub: nada de segredos nem dados de clientes em código, comentários ou documentos.
- **Lei:** a classe energética tem de aparecer em cada anúncio de venda. Anunciar imóveis de terceiros exige licença AMI; a Lovely ainda não confirmou se a tem (ver "Pendente do cliente").

## Abordagens consideradas

**Onde vivem os anúncios**
- **Tabela própria `sale_listings`, com ligação opcional a uma casa (`property_id`) — escolhida.** Isolada das reservas: nada do que lê `properties` passa a ver casas à venda.
- Acrescentar colunas de venda a `properties` (tipo "alojamento / venda / ambos", como no mockup). Rejeitada: `properties` alimenta reservas, pesquisa, iCal, API de parceiros, sitemap e portal dos proprietários; cada um teria de excluir as casas só de venda, e um esquecimento tornava uma casa à venda reservável.
- Guardar os anúncios como conteúdo JSON do CMS. Rejeitada: sem estrutura para filtrar, ordenar, validar e indexar.

**Como um anúncio usa os dados de uma casa gerida** (decidido pelo Marcelo a 2026-11-20)
- **Copiar ao ligar — escolhida.** Ao ligar o anúncio a uma casa, o editor copia fotos, quartos, casas de banho, área, comodidades, descrição e localização para o anúncio, onde a equipa as adapta a quem compra. Mudanças futuras no alojamento não mexem no anúncio. Os números de rendimento vêm sempre das reservas, calculados de novo.
- Ler sempre da casa. Rejeitada: o anúncio ficaria com textos e fotos pensados para hóspedes, e mudaria sem ninguém dar por isso.

## O que foi decidido

### Site público

**Menu:** entrada "Imóveis à venda" / "For sale" no `Navbar` (desktop e telemóvel) e no rodapé.

**Catálogo — `/[locale]/for-sale`** (página do servidor, dados carregados no servidor):
- Topo com foto, título e texto curto.
- Pesquisa: localização (cidades com anúncios publicados), tipo, quartos (1+, 2+, 3+) e preço máximo. Os filtros e a ordem ficam no URL (para partilhar e para o Google não ver páginas vazias diferentes).
- Separadores por tipo com contagem (Todos, Apartamentos, Moradias, Prédios; Terrenos só aparece se houver) e ordem (mais recentes, preço crescente, preço decrescente).
- Cartão: foto principal; etiqueta "Novo" (publicado há menos de 30 dias), "Reservado", "Com proposta" ou "Vendido"; etiqueta "Gera rendimento" se o anúncio mostra o resumo de rendimento; título e subtítulo; cidade e rua/zona; preço ou "Preço sob consulta" e preço/m²; classe energética; tipologia, área, quartos, casas de banho; botão "Ver imóvel".
- Imóveis vendidos continuam visíveis (cinzentos, com "Vendido", sem preço) até a equipa os despublicar, sempre no fim da lista.
- Sem anúncios publicados: mensagem simpática e o bloco do proprietário.
- Bloco "Quer vender a sua casa?" com botão para a página de contacto existente (`/contact`). Sem formulário novo na Fase 1.

**Página do imóvel — `/[locale]/for-sale/[slug]`** (servidor; `notFound()` se não existir ou não estiver publicado):
- Voltar ao catálogo; galeria (reaproveitar o componente de galeria das casas); planta como botão se existir.
- Etiquetas ("À venda" ou o estado; "Gera rendimento"), referência `LM-V-0042`, título, subtítulo, zona (rua sem número, bairro, cidade). A morada exata nunca aparece.
- Ficha: tipologia, área bruta, área útil, terreno, quartos, casas de banho, classe energética, estado de conservação, ano de renovação, mobilado. Campos vazios não aparecem.
- Descrição (pt/en) e lista de características.
- **Resumo do rendimento** (só se o anúncio estiver ligado a uma casa e a equipa o ativar): receita de alojamento dos últimos 12 meses, rentabilidade bruta (receita ÷ preço; não aparece com "Preço sob consulta"), ocupação, e o número da licença de alojamento local. Nota de rodapé com a definição ("receita depois das comissões das plataformas, antes dos custos de gestão e impostos; últimos 12 meses"). Ligação "Ver planos de gestão" para `/join`. Definição exata do cálculo em "Rendimento".
- Localização: mapa da zona aproximada (círculo, sem pino exato) e locais próximos.
- Documentos: a planta em PDF, se existir. **O certificado energético não é publicado**: o PDF traz a morada completa, o artigo matricial e a fração. A página mostra a classe energética (obrigatória) e "Certificado energético disponível a pedido". *(Decisão do Claude, depois da revisão.)*
- Caixa de contacto: preço, estado e "anunciado há N dias"; escolha "Pedir informação" / "Marcar visita"; formulário (ver "Formulário"); botão de WhatsApp só se houver número nas definições; botão partilhar.
- Cartão "Lovely Memories Vendas" com o nº AMI só se estiver preenchido nas definições.
- "Também pode gostar": até 3 anúncios publicados e disponíveis, da mesma cidade primeiro.
- Telemóvel: barra fixa em baixo com preço, WhatsApp (se houver) e "Pedir informação".
- SEO: título e descrição gerados como em `lib/property-seo.ts` (ex.: "Garden House Paranhos — Moradia T1 à venda no Porto"), canonical e hreflang, imagem OG, JSON-LD do anúncio (`RealEstateListing` com `Offer`: preço, moeda, disponibilidade), entrada no sitemap em cada língua para cada anúncio publicado, e o catálogo em `STATIC_PATHS`.

**Formulário de contacto (por imóvel)**
- Campos: nome, email, telefone (com indicativo), objetivo (viver / investir / ambos), mensagem (pré-preenchida com o nome e a referência do imóvel), consentimento de dados (obrigatório, com ligação à Política de Privacidade). Em "Marcar visita", mais um campo de texto "Datas e horas que lhe dão jeito".
- Envio para **info@lovelymemories.pt**, `replyTo` o email do comprador, assunto com a referência e o tipo de pedido. **Confirmação curta ao comprador** na língua da página (pt/en), com o nome do imóvel e a referência.
- Validação no servidor (zod), todos os campos escapados nos emails, proteção contra spam (campo escondido como os formulários atuais, limite por browser, e limite por IP e por email no servidor), e **nenhum dado pessoal nos registos** (só referência do imóvel e resultado).
- **Limite no servidor:** um limite em memória não funciona na Vercel (cada instância tem o seu). Usa uma tabela pequena de contadores, `form_rate_limits`, com o IP e o email guardados em hash (nunca em claro), uma janela de tempo e o número de pedidos, apagados ao fim de um dia; só o servidor lhe chega (RLS sem políticas). Limites indicativos: 5 pedidos por IP por hora, 3 por email por dia, e no máximo 1 confirmação por email por hora (para o formulário não servir para mandar emails a terceiros). Se a tabela falhar, o pedido passa (o email à equipa nunca se perde por causa do contador). Fica pronta a servir mais tarde os outros formulários e o limite de login (S-10). *(Decisão do Claude, depois da revisão.)*
- Os pedidos em si **não são gravados** (sem caixa de pedidos); a tabela de contadores não guarda nomes, mensagens nem emails em claro.

### Backoffice

**Acesso:** módulo novo `sales` nas permissões. Administradores com acesso por defeito; editores também (como em Propriedades), configurável no ecrã de funções. Entrada "Vendas" no menu lateral e na barra do telemóvel.

**Lista — `/admin/sales`:** foto, referência, título, cidade, preço, estado, publicado/rascunho, data; filtro por estado; botão "Novo anúncio"; abrir para editar.

**Editor — `/admin/sales/new` e `/admin/sales/[id]`**, com separadores:
- **Fotos:** carregar (redimensionadas no browser antes de subir), ordenar, escolher a principal, texto alternativo pt/en, apagar.
- **Informação:** ligação opcional a uma casa gerida (pesquisa por nome) com botão "Copiar dados da casa"; título, subtítulo, slug (gerado do título, editável), tipo (apartamento, moradia, prédio, terreno), tipologia (T0…T5+), quartos, casas de banho, estado de conservação (novo, renovado, bom, para renovar), áreas bruta/útil/terreno, ano de renovação, mobilado; descrição pt/en; características pt/en.
- **Venda:** preço, preço/m² calculado, "Preço sob consulta", "Negociável"; estado (Disponível, Reservado, Com proposta, Vendido).
- **Localização:** cidade, bairro/zona, rua (pública, sem número), morada exata (só para a equipa), ponto no mapa; locais próximos.
- **Documentos:** classe energética (obrigatória para publicar; inclui "Isento"), nº do certificado e PDF do certificado (ambos só para a equipa, no bucket privado), PDF da planta (público).
- **Rendimento** (só com casa ligada): os números calculados (receita, rentabilidade, ocupação, desde quando há dados), interruptor "Mostrar no anúncio", nº da licença de alojamento local.
- Coluna lateral: publicado / rascunho, referência (gerada automaticamente, `LM-V-0001`, `LM-V-0002`…), pré-visualização do cartão, botão "Ver página" (abre a página pública; um rascunho só é visível para a equipa com sessão), "Guardar" e "Publicar".
- Publicar exige: título em pelo menos uma língua, pelo menos uma foto, tipo, preço (ou "sob consulta"), classe energética e cidade. O editor diz o que falta.

**"Copiar dados da casa":** copia `images` (as mesmas URLs, não duplica ficheiros), `bedrooms`, `bathrooms`, `area` (para área bruta), `description` (pt/en), `city`, `lat`/`lng`, `address` (para a morada exata da equipa). As comodidades da casa aparecem como sugestões que a equipa marca para a lista de características. Se o anúncio já tiver dados, pede confirmação antes de substituir. A ligação fica guardada (para o rendimento) mesmo que a equipa não copie nada.

**Definições (só super admin, página de definições existente):** nº AMI e número de WhatsApp de vendas, em `system_settings`. Lidos no servidor com a service role (sem política pública nova).

### Dados

Tabela `sale_listings` (nomes indicativos; o tipo exato é do construtor):
- identificação: `id`, `reference` (única, gerada por sequência), `slug` (único), `property_id` (opcional, `on delete set null`), `created_by`, `created_at`, `updated_at`, `published` (bool), `published_at`;
- estado e preço: `status` (`available` | `reserved` | `under_offer` | `sold`), `price`, `price_on_request`, `negotiable`;
- textos (jsonb `{en, pt}`): `title`, `subtitle`, `description`; `features` (lista de `{en, pt}`);
- imóvel: `type` (`apartment` | `house` | `building` | `land`), `typology`, `bedrooms`, `bathrooms`, `condition`, `gross_area`, `useful_area`, `plot_area`, `year_renovated`, `furnished`;
- localização: `city`, `area_label` (bairro/zona), `street` (pública), `address_private`, `lat`, `lng`, `nearby` (lista);
- documentos: `energy_class` (pública), `energy_cert_number` e `energy_cert_path` (só equipa; caminho no bucket privado), `floor_plan_url` (pública);
- fotos: `images` (lista de `{url, alt: {en, pt}, order, is_main}`, como em `properties`);
- rendimento: `show_performance`, `al_license`.

**Acesso:** RLS ligado e **nenhuma política nem permissão para `anon`/`authenticated`** (como `property_ical_feeds`). As páginas públicas leem no servidor com a service role, só anúncios publicados e só as colunas públicas (nunca `address_private`, `created_by`, `energy_cert_number` nem `energy_cert_path`). O backoffice lê e escreve através de ações do servidor com `requireRole` e verificação do módulo `sales`. Acrescentar `sale_listings` ao `check:exposure`.

**Ficheiros:** dois buckets novos, ambos com escrita e apagamento só para a equipa (políticas em `storage.objects` com `public.has_role('super_admin' | 'admin' | 'editor')`):
- `sale-listings` (leitura pública): fotos e planta, em `<listing id>/photos/…` e `<listing id>/docs/…`;
- `sale-listings-private` (leitura só da equipa, por URL assinado): certificado energético.

(O bucket `properties` atual deixa qualquer conta escrever; não copiar esse padrão.)

**Contadores do formulário:** tabela `form_rate_limits` (ver "Formulário"), RLS sem políticas; acrescentar ao `check:exposure`.

### Rendimento (resumo do investimento)

Calculado no servidor a partir da casa ligada. **Receita e ocupação vêm da mesma fonte**, as reservas com valor (reservas do site e estadias do Airbnb importadas do CSV de ganhos), para não mostrar ocupação de estadias sem a receita correspondente. *(Decisão do Claude a 2026-11-20, depois da revisão.)*
- **Fonte:** `reservations` da casa com estado em `OWNER_REPORT_STATUSES`. Os bloqueios do iCal (`blocked_dates`, incluindo os do Airbnb "Reserved" e "Airbnb (Not available)") **nunca contam**: não têm valor, e "Not available" mistura estadias de outros canais, datas fechadas pelo proprietário e os próprios bloqueios manuais do site devolvidos pelo Airbnb.
- **Janela:** 12 meses que acabam na **data dos dados** da casa = o mais antigo entre ontem e o último check-out das estadias do Airbnb importadas (se a casa tiver estadias importadas; senão, ontem). Assim a janela nunca inclui meses em que o Airbnb ainda não foi importado. A 2026-11-20, nas 27 casas com estadias importadas, esse último check-out ia de 2026-06-20 a 2026-12-11 (mediana 2026-10-12).
- **Receita:** soma de `ownerRevenue()` (`lib/owner-revenue.ts`: `net_amount` do Airbnb, ou total sem taxa turística e extras nas reservas do site) das reservas com check-in dentro da janela.
- **Ocupação:** noites reservadas dentro da janela (cada estadia cortada às pontas da janela, a mesma noite contada uma só vez) ÷ dias da janela.
- **Rentabilidade bruta:** receita ÷ preço pedido. Só aparece com 12 meses completos de dados e com preço visível.
- **Historial curto:** com menos de 12 meses, a janela começa na primeira estadia, a página mostra receita e ocupação "desde <mês ano>" e esconde a rentabilidade. Com menos de 3 meses, o interruptor fica desativado no editor.
- **No editor:** os números, a "data dos dados" e um aviso quando essa data tem mais de 60 dias ("importe o CSV de ganhos do Airbnb mais recente"). A equipa decide se mostra.
- **Na página:** nota de rodapé "receita depois das comissões das plataformas, antes dos custos de gestão e impostos; 12 meses até <mês ano>". Recalculados no máximo uma vez por dia.
- **Ligação:** só a uma casa reservável (sem unidades). Os edifícios com várias unidades (Belomonte, DPV Residences, The Virtuous, RDM) não se ligam na Fase 1; um anúncio de prédio fica sem resumo de rendimento. *(Decisão do Claude; somar várias unidades fica para depois, se o cliente quiser vender um edifício gerido.)*

### Testes (sem efeitos em produção)

- Nada de emails reais: o envio do formulário é testado com o envio substituído (simulação) ou com um modo de teste que só regista; o template é verificado renderizado.
- Nada de reservas. O cálculo de rendimento é testado com dados simulados (incluindo a mesma estadia como reserva e como bloqueio) e verificado em leitura contra 2–3 casas reais.
- Anúncios de teste criados durante a verificação ficam em rascunho e são apagados no fim (e os ficheiros do bucket também).
- `npx tsc --noEmit`, `npm run build`, lint igual ou melhor, `check:exposure` sem FAIL, e o manifesto de ações (`server-reference-manifest.json`) revisto: nenhuma função que confie nos argumentos exposta.

### Antes de construir: mockup atualizado para o cliente

Atualizar `/mockups-propertysell/a` com estas decisões, para o cliente aprovar: retirar o ecrã de pedidos e o separador "Leads" e a língua HE; trocar "Alojamento / Venda / Ambos" pela ligação opcional a uma casa; acrescentar a lista de anúncios e os separadores do editor (Fotos, Informação, Venda, Localização, Documentos, Rendimento); retirar favoritos e avaliação dos hóspedes; pôr "Marcar visita" com o campo de datas. Os ecrãs da Opção B ficam como estão.

## Pendente do cliente (não bloqueia a construção)

- **Licença AMI:** se a Lovely tem. A Fase 1 constrói só a versão com AMI: o cartão "Lovely Memories Vendas" e o nº AMI aparecem quando o número estiver nas definições, e ficam escondidos sem ele. Se a Lovely não tiver AMI, os anúncios de casas de terceiros têm de aparecer como venda direta do proprietário; nesse caso ajustam-se os textos (e, se preciso, um campo "vendedor" por anúncio) antes de publicar casas de terceiros. *(Decisão do Claude, depois da revisão.)*
- **Número de WhatsApp de vendas** (o site não tem nenhum hoje).
- **Autorização dos proprietários** para publicar os números de rendimento das suas casas (decisão comercial da Lovely; o interruptor por anúncio já o permite).

## Deixado ao construtor

- Nomes exatos de tabelas, colunas, tipos e índices; como gerar a sequência da referência.
- Divisão em componentes e ficheiros; reaproveitar componentes existentes (galeria, editores de texto pt/en) quando servirem.
- Biblioteca e parâmetros do redimensionamento das fotos no browser.
- Como guardar em cache os números de rendimento (uma vez por dia).
- Mapa: reaproveitar o que as páginas das casas usam, se servir para uma zona aproximada.
- Ordem de construção dentro da Fase 1, desde que cada passo seja verificável sem efeitos em produção.
