-- Fecha a tabela locked_dates ao público (auditoria 2026-11-13, S-9).
--
-- locked_dates guarda o bloqueio de 15 minutos de quem está no checkout, com o código da
-- sessão (session_id) desse browser. Com a chave pública (está no JavaScript do site) dava
-- para ler esses códigos — confirmado a 18/11: 89 linhas legíveis, com session_id. Com o
-- código de outra pessoa dava para:
--   - libertar o bloqueio dela (DELETE /api/bookings/lock),
--   - ficar com o bloqueio ou prolongá-lo em nome dela,
--   - pagar por cima do bloqueio dela (o servidor ignora o bloqueio da "própria" sessão).
--
-- Quem lê e escreve nesta tabela é só o servidor, com a service role, que ignora o RLS:
--   - app/api/bookings/lock (criar, prolongar e libertar bloqueios),
--   - verifyAvailability / getUnavailableDates (lib/pricing.ts), chamados pelo servidor
--     com a service role (validatePropertyAvailability passou a usá-la no mesmo commit),
--   - a função get_unavailable_property_ids (pesquisa), que é SECURITY DEFINER.
-- O browser nunca lê a tabela diretamente. Nenhum bloqueio é apagado.
--
-- Aplicar à mão no SQL Editor da Supabase, depois do deploy do código.

BEGIN;

-- Todas as políticas da tabela (foram criadas no painel, não há migração com os nomes).
DO $$
DECLARE p record;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'locked_dates' LOOP
        EXECUTE format('DROP POLICY %I ON public.locked_dates', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.locked_dates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.locked_dates FROM anon, authenticated;

-- Segurança: sem estas permissões da service role o checkout deixava de bloquear datas.
-- Nesse caso esta instrução falha e nada do que está acima fica aplicado.
DO $$
BEGIN
    IF NOT (has_table_privilege('service_role', 'public.locked_dates', 'SELECT')
        AND has_table_privilege('service_role', 'public.locked_dates', 'INSERT')
        AND has_table_privilege('service_role', 'public.locked_dates', 'UPDATE')
        AND has_table_privilege('service_role', 'public.locked_dates', 'DELETE')) THEN
        RAISE EXCEPTION 'A service_role não tem todas as permissões em locked_dates. Nada foi alterado.';
    END IF;
END $$;

COMMIT;

-- Verificação (o SQL Editor mostra este resultado). Esperado:
--   SELECT anon / authenticated -> false
--   SELECT service_role         -> true
--   e nenhuma linha "política:"
SELECT 'SELECT ' || r AS verificacao,
       has_table_privilege(r, 'public.locked_dates', 'SELECT')::text AS resultado
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r
UNION ALL
SELECT 'política: ' || policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'locked_dates';

-- Para voltar atrás (não recomendado: volta a expor os códigos das sessões):
-- GRANT SELECT ON public.locked_dates TO anon, authenticated;
-- CREATE POLICY "Public read locked dates" ON public.locked_dates FOR SELECT TO public USING (true);
