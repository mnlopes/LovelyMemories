-- Fecha a escrita pública em visitor_logs (auditoria 2026-11-13, S-14).
--
-- A política "Anyone can insert visitor logs" (20260205125000_visitor_analytics.sql) dava
-- INSERT a qualquer pessoa com a chave pública, que está no JavaScript do site. Dava para
-- encher a base de dados (500 MB no plano Free), falsificar as estatísticas e pôr um
-- proprietário a aparecer "online". Confirmado em produção a 14/11 com a chave pública.
--
-- Só o proxy (proxy.ts) escreve nesta tabela, com a service role, que ignora o RLS e tem
-- as suas próprias permissões: o registo de visitas continua igual. A leitura pelos admins
-- (política "Admins can read visitor logs") não muda. Não se apaga nenhuma visita e não se
-- mexe no DELETE (a retenção fica como está).
--
-- Aplicar à mão no SQL Editor da Supabase. Não precisa de deploy.

BEGIN;

DROP POLICY IF EXISTS "Anyone can insert visitor logs" ON public.visitor_logs;

REVOKE INSERT ON public.visitor_logs FROM anon, authenticated;

-- Segurança: se a service role não puder inserir, o site deixava de registar visitas.
-- Nesse caso esta instrução falha e nada do que está acima fica aplicado.
DO $$
BEGIN
    IF NOT has_table_privilege('service_role', 'public.visitor_logs', 'INSERT') THEN
        RAISE EXCEPTION 'A service_role não tem INSERT em visitor_logs. Nada foi alterado.';
    END IF;
END $$;

COMMIT;

-- Verificação (o SQL Editor mostra este resultado). Esperado:
--   permissão INSERT: anon           -> false
--   permissão INSERT: authenticated  -> false
--   permissão INSERT: service_role   -> true
--   política: Admins can read visitor logs -> SELECT   (e mais nenhuma)
SELECT 'permissão INSERT: ' || r AS verificacao,
       has_table_privilege(r, 'public.visitor_logs', 'INSERT')::text AS resultado
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r
UNION ALL
SELECT 'política: ' || policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'visitor_logs';

-- Para voltar atrás (não recomendado):
-- GRANT INSERT ON public.visitor_logs TO anon, authenticated;
-- CREATE POLICY "Anyone can insert visitor logs" ON public.visitor_logs
--     FOR INSERT TO public WITH CHECK (true);
