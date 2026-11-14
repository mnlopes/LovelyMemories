-- Apaga a coluna pública com os links privados do Airbnb (auditoria 2026-11-13, S-2).
-- PASSO 2 de 2.
--
-- ⚠️ SÓ APLICAR DEPOIS de o código que usa public.property_ical_feeds estar em produção
-- e de o cron do iCal ter corrido com sucesso pelo menos uma vez com ele. O código antigo
-- lê properties.ical_import_urls; apagar a coluna antes disso parava a sincronização.
--
-- A partir deste passo a fuga fica fechada: a coluna deixa de existir na tabela pública.
-- Depois disto, o cliente deve gerar links de exportação novos no Airbnb (se o painel do
-- Airbnb o permitir), porque os atuais estiveram expostos.
--
-- Aplicar à mão no SQL Editor da Supabase.

BEGIN;

ALTER TABLE public.properties DROP COLUMN IF EXISTS ical_import_urls;

-- A mensagem de erro da sincronização continua em properties (o admin mostra-a), mas o
-- código novo nunca lá escreve o link. Limpa qualquer mensagem antiga que o contenha.
UPDATE public.properties
SET last_sync_error = NULL
WHERE last_sync_error ~* 'https?://';

COMMIT;

-- O PostgREST (API da Supabase) passa a ignorar a coluna apagada.
NOTIFY pgrst, 'reload schema';

-- Verificação: deve devolver 0 linhas (a coluna já não existe).
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'ical_import_urls';
