-- Área de casas à venda: tabela, contadores do formulário, ficheiros e permissões.
--
-- O que cria (tudo novo, nada existente é alterado nem apagado):
--   - public.sale_listings     os anúncios de venda (rascunhos e publicados);
--   - public.form_rate_limits  contadores para limitar pedidos do formulário de contacto;
--   - public.hit_rate_limit()  conta um pedido e diz se ainda está dentro do limite;
--   - dois buckets de ficheiros: sale-listings (público) e sale-listings-private (só equipa);
--   - as linhas do módulo 'sales' em role_permissions.
--
-- Acesso (como property_ical_feeds): RLS ligado, sem políticas, e sem permissões para
-- anon/authenticated. O site público lê no servidor com a service role, só anúncios
-- publicados e só as colunas públicas; o backoffice usa ações do servidor. O browser nunca
-- lê estas tabelas diretamente. Isto protege address_private (morada exata),
-- energy_cert_number, energy_cert_path e created_by.
--
-- Ficheiros: o bucket 'properties' atual deixa qualquer conta escrever; aqui só a equipa
-- (super_admin, admin, editor) escreve e apaga. O bucket sale-listings é público para leitura
-- (fotos e planta, por URL); o certificado energético vai para sale-listings-private e só a
-- equipa o lê.
--
-- Pode ser corrida duas vezes sem erro (IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT).
-- Aplicar à mão no SQL Editor da Supabase, ANTES de publicar o código que a usa.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Anúncios de venda
-- ---------------------------------------------------------------------------

-- Dá a referência pública do anúncio: LM-V-0001, LM-V-0002...
CREATE SEQUENCE IF NOT EXISTS public.sale_listing_ref_seq;

CREATE TABLE IF NOT EXISTS public.sale_listings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           text NOT NULL UNIQUE
                            DEFAULT ('LM-V-' || lpad(nextval('public.sale_listing_ref_seq')::text, 4, '0')),
    slug                text NOT NULL UNIQUE,
    property_id         uuid REFERENCES public.properties(id) ON DELETE SET NULL,

    published           boolean NOT NULL DEFAULT false,
    published_at        timestamptz,

    -- Estado e preço
    status              text NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available', 'reserved', 'under_offer', 'sold')),
    price               numeric(12,2),
    price_on_request    boolean NOT NULL DEFAULT false,
    negotiable          boolean NOT NULL DEFAULT false,

    -- Textos ({en, pt}) e lista de características ([{en, pt}])
    title               jsonb NOT NULL DEFAULT '{}'::jsonb,
    subtitle            jsonb NOT NULL DEFAULT '{}'::jsonb,
    description         jsonb NOT NULL DEFAULT '{}'::jsonb,
    features            jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Imóvel. type pode estar vazio num rascunho; as regras para publicar estão no código.
    type                text CHECK (type IN ('apartment', 'house', 'building', 'land')),
    typology            text,
    bedrooms            integer,
    bathrooms           integer,
    condition           text CHECK (condition IN ('new', 'renovated', 'good', 'to_renovate')),
    gross_area          numeric(10,2),
    useful_area         numeric(10,2),
    plot_area           numeric(10,2),
    year_renovated      integer,
    furnished           boolean,

    -- Localização. address_private é a morada exata, só para a equipa.
    city                text NOT NULL DEFAULT '',
    area_label          text NOT NULL DEFAULT '',
    street              text,
    address_private     text,
    lat                 numeric(9,6),
    lng                 numeric(9,6),
    nearby              jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Documentos. energy_cert_number e energy_cert_path são só da equipa.
    energy_class        text CHECK (energy_class IN ('A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'exempt')),
    energy_cert_number  text,
    energy_cert_path    text,
    floor_plan_url      text,

    -- Fotos: [{url, alt: {en, pt}, order, is_main}]
    images              jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Rendimento (resumo do investimento)
    show_performance    boolean NOT NULL DEFAULT false,
    al_license          text,

    created_by          uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sale_listings_published_idx
    ON public.sale_listings (published, published_at DESC);
CREATE INDEX IF NOT EXISTS sale_listings_property_id_idx
    ON public.sale_listings (property_id);

ALTER TABLE public.sale_listings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Contadores do formulário de contacto
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.form_rate_limits (
    key           text NOT NULL,
    window_start  timestamptz NOT NULL,
    count         integer NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
);

ALTER TABLE public.form_rate_limits ENABLE ROW LEVEL SECURITY;

-- Conta um pedido para a chave p_key na janela atual (janelas fixas de p_window_seconds)
-- e devolve true se ainda está dentro do limite p_max. Chamada só pelo servidor.
-- Apaga de caminho as linhas com mais de um dia, para a tabela não crescer.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window timestamptz;
    v_count  integer;
BEGIN
    v_window := date_bin(make_interval(secs => p_window_seconds), now(), timestamptz '2000-01-01');

    INSERT INTO public.form_rate_limits AS f (key, window_start, count)
    VALUES (p_key, v_window, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = f.count + 1
    RETURNING f.count INTO v_count;

    DELETE FROM public.form_rate_limits WHERE window_start < now() - interval '1 day';

    RETURN v_count <= p_max;
END;
$$;

-- Só o servidor (service role) a pode chamar: com a chave pública qualquer pessoa enchia
-- a tabela de contadores ou gastava o limite dos outros.
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Permissões das tabelas
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.sale_listings FROM anon, authenticated;
REVOKE ALL ON public.form_rate_limits FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.sale_listing_ref_seq FROM anon, authenticated;

-- A service role fica com as permissões explícitas (não depender só dos defaults do Supabase).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_listings, public.form_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sale_listing_ref_seq TO service_role;

-- Segurança: sem estas permissões da service role o site não lia nem gravava anúncios.
-- Nesse caso esta instrução falha e nada do que está acima fica aplicado.
DO $$
BEGIN
    IF NOT (has_sequence_privilege('service_role', 'public.sale_listing_ref_seq', 'USAGE')
        AND has_table_privilege('service_role', 'public.sale_listings', 'SELECT')
        AND has_table_privilege('service_role', 'public.sale_listings', 'INSERT')
        AND has_table_privilege('service_role', 'public.sale_listings', 'UPDATE')
        AND has_table_privilege('service_role', 'public.sale_listings', 'DELETE')
        AND has_table_privilege('service_role', 'public.form_rate_limits', 'SELECT')
        AND has_table_privilege('service_role', 'public.form_rate_limits', 'INSERT')
        AND has_table_privilege('service_role', 'public.form_rate_limits', 'UPDATE')
        AND has_table_privilege('service_role', 'public.form_rate_limits', 'DELETE')
        AND has_function_privilege('service_role', 'public.hit_rate_limit(text, integer, integer)', 'EXECUTE')) THEN
        RAISE EXCEPTION 'A service_role não tem todas as permissões em sale_listings / form_rate_limits / hit_rate_limit. Nada foi alterado.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Ficheiros (storage)
-- ---------------------------------------------------------------------------

-- sale-listings: público (fotos e planta, lidas por URL, sem política de leitura).
-- sale-listings-private: privado (certificado energético, lido por URL assinado).
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-listings', 'sale-listings', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-listings-private', 'sale-listings-private', false)
ON CONFLICT (id) DO NOTHING;

-- Escrever e apagar: só a equipa (não copia o padrão do bucket 'properties').
DROP POLICY IF EXISTS "sale_listings staff insert" ON storage.objects;
CREATE POLICY "sale_listings staff insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('sale-listings', 'sale-listings-private')
        AND (public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('editor'))
    );

DROP POLICY IF EXISTS "sale_listings staff update" ON storage.objects;
CREATE POLICY "sale_listings staff update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id IN ('sale-listings', 'sale-listings-private')
        AND (public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('editor'))
    )
    WITH CHECK (
        bucket_id IN ('sale-listings', 'sale-listings-private')
        AND (public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('editor'))
    );

DROP POLICY IF EXISTS "sale_listings staff delete" ON storage.objects;
CREATE POLICY "sale_listings staff delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id IN ('sale-listings', 'sale-listings-private')
        AND (public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('editor'))
    );

-- Ler (só a equipa), nos dois buckets. O bucket público é lido por URL sem política; esta é
-- para o backoffice: o Storage exige SELECT para remove(), upsert e move() com sessão de utilizador.
DROP POLICY IF EXISTS "sale_listings staff select" ON storage.objects;
DROP POLICY IF EXISTS "sale_listings private staff select" ON storage.objects;
CREATE POLICY "sale_listings staff select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id IN ('sale-listings', 'sale-listings-private')
        AND (public.has_role('super_admin') OR public.has_role('admin') OR public.has_role('editor'))
    );

-- ---------------------------------------------------------------------------
-- 5. Permissões do módulo 'sales' na matriz Roles & Permissions
-- ---------------------------------------------------------------------------

-- super_admin passa sempre. Quem já tiver linha (unique role_name + module_name) fica como está.
INSERT INTO public.role_permissions (role_name, module_name, can_view, can_edit) VALUES
    ('admin',  'sales', true,  true),
    ('editor', 'sales', true,  true),
    ('owner',  'sales', false, false)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificação (o SQL Editor mostra este resultado). Esperado:
--   SELECT sale_listings / form_rate_limits, anon e authenticated -> false
--   SELECT sale_listings / form_rate_limits, service_role         -> true
--   EXECUTE hit_rate_limit anon                                   -> false
--   e as 4 políticas "política:" (INSERT, UPDATE, DELETE e SELECT, só equipa, nos dois buckets)
SELECT 'SELECT ' || t || ' ' || r AS verificacao,
       has_table_privilege(r, 'public.' || t, 'SELECT')::text AS resultado
FROM unnest(ARRAY['sale_listings', 'form_rate_limits']) AS t,
     unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r
UNION ALL
SELECT 'EXECUTE hit_rate_limit anon',
       has_function_privilege('anon', 'public.hit_rate_limit(text, integer, integer)', 'EXECUTE')::text
UNION ALL
SELECT 'política: ' || policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'sale\_listings %';

-- Para voltar atrás (apaga anúncios e contadores; só se ainda não houver dados a guardar):
-- DROP POLICY IF EXISTS "sale_listings staff insert" ON storage.objects;
-- DROP POLICY IF EXISTS "sale_listings staff update" ON storage.objects;
-- DROP POLICY IF EXISTS "sale_listings staff delete" ON storage.objects;
-- DROP POLICY IF EXISTS "sale_listings staff select" ON storage.objects;
-- (os buckets só se apagam no painel Storage, depois de esvaziados)
-- DROP FUNCTION IF EXISTS public.hit_rate_limit(text, integer, integer);
-- DROP TABLE IF EXISTS public.form_rate_limits;
-- DROP TABLE IF EXISTS public.sale_listings;
-- DROP SEQUENCE IF EXISTS public.sale_listing_ref_seq;
-- DELETE FROM public.role_permissions WHERE module_name = 'sales';
