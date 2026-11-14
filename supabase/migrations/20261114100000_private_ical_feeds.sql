-- Links privados do Airbnb/Booking numa tabela própria (auditoria 2026-11-13, S-2).
-- PASSO 1 de 2. Seguro de aplicar com o código antigo ainda em produção: só acrescenta.
--
-- PROBLEMA
-- properties.ical_import_urls guarda o link de calendário de cada anúncio, e a tabela
-- properties tem de ser pública (é o site). Cada link leva um código secreto (t=/s=):
-- quem o tem lê o calendário do anúncio no Airbnb, com os códigos das reservas e os
-- últimos dígitos do telefone dos hóspedes. Confirmado a 2026-11-13: os 38 links eram
-- legíveis com a chave pública.
--
-- SOLUÇÃO (o mesmo modelo de airbnb_feeds no projeto Galeguesthouses, migração 0075)
--   * uma tabela só para os links, uma linha por link;
--   * RLS ligada e NENHUMA política para anon/authenticated: só o servidor
--     (service role) lê e escreve;
--   * e, como segunda camada, sem permissões de base para anon/authenticated, para que
--     um erro numa política futura não seja o único passo até uma fuga;
--   * o resultado de cada leitura fica guardado por link (corrige também o achado L-5:
--     a limpeza de bloqueios só corre quando todos os links foram lidos com sucesso).
--
-- O PASSO 2 (20261114100100_drop_properties_ical_import_urls.sql) apaga a coluna antiga.
-- Só se aplica DEPOIS de o código novo estar em produção.
--
-- Aplicar à mão no SQL Editor da Supabase. Corre numa transação.
-- Reversível: `drop table public.property_ical_feeds;` (enquanto a coluna antiga existir).

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_ical_feeds (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id  uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    -- **Um segredo.** Só o servidor o lê; nunca vai para o browser, para logs nem para
    -- mensagens de erro.
    import_url   text NOT NULL
        CONSTRAINT property_ical_feeds_https CHECK (import_url LIKE 'https://%'),
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_read_at timestamptz,
    last_ok_at   timestamptz,
    last_outcome text
        CONSTRAINT property_ical_feeds_outcome
        CHECK (last_outcome IN ('ok', 'not_a_calendar', 'unreachable', 'refused', 'error')),
    -- Mensagem para o admin. Nunca contém o link.
    last_error   text
        CONSTRAINT property_ical_feeds_error_length CHECK (char_length(last_error) <= 300),
    CONSTRAINT property_ical_feeds_unique UNIQUE (property_id, import_url)
);

CREATE INDEX IF NOT EXISTS property_ical_feeds_property_idx
    ON public.property_ical_feeds (property_id);

-- Camada 1: RLS ligada e nenhuma política para anon/authenticated (nega tudo).
ALTER TABLE public.property_ical_feeds ENABLE ROW LEVEL SECURITY;

-- Camada 2: sem permissões de base. As "default privileges" deste projeto
-- (20260528_supabase_api_grants_compatibility.sql) dão SELECT a anon e escrita a
-- authenticated em cada tabela nova; aqui retiram-se.
REVOKE ALL ON public.property_ical_feeds FROM anon, authenticated;

-- Copiar os links atuais (38 a 2026-11-14, todos https, todos do Airbnb).
INSERT INTO public.property_ical_feeds (property_id, import_url)
SELECT p.id, trim(u.url)
FROM public.properties p
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.ical_import_urls, '[]'::jsonb)) AS u(url)
WHERE trim(u.url) LIKE 'https://%'
ON CONFLICT (property_id, import_url) DO NOTHING;

COMMIT;

-- Verificação: deve mostrar 38 links em 38 casas.
SELECT count(*) AS links_copiados, count(DISTINCT property_id) AS casas
FROM public.property_ical_feeds;
