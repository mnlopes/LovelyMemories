-- Documentos dos anúncios de venda: lista de documentos extra e certificado energético público.
--
-- O que muda (só acrescenta; nada existente é alterado nem apagado):
--   - sale_listings.documents           lista de documentos extra (caderneta predial, licença de
--                                       utilização, ...): [{ id, name {pt,en}, path, public, size }];
--   - sale_listings.energy_cert_public  se o PDF do certificado energético aparece aos compradores
--                                       (por defeito não: continua "disponível a pedido").
--
-- Acesso: igual ao resto de sale_listings (RLS ligado, sem políticas, sem permissões para
-- anon/authenticated). Os ficheiros ficam todos no bucket privado sale-listings-private, em
-- <id do anúncio>/docs/. O site nunca recebe os caminhos: um documento marcado como público
-- abre-se por /api/sale-doc/<anúncio>/<documento>, que confirma no servidor que está público
-- e só então dá um link temporário (2 minutos) para o ficheiro.
--
-- Pode ser corrida duas vezes sem erro (IF NOT EXISTS).
-- Aplicar à mão no SQL Editor da Supabase, ANTES de publicar o código que a usa.

BEGIN;

ALTER TABLE public.sale_listings
    ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS energy_cert_public boolean NOT NULL DEFAULT false;

-- documents é sempre uma lista (nunca null nem um objeto solto).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sale_listings_documents_is_array'
    ) THEN
        ALTER TABLE public.sale_listings
            ADD CONSTRAINT sale_listings_documents_is_array CHECK (jsonb_typeof(documents) = 'array');
    END IF;
END $$;

COMMIT;

-- Verificação (deve mostrar as 2 colunas novas):
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sale_listings'
  AND column_name IN ('documents', 'energy_cert_public');

-- Desfazer (só se for mesmo preciso; apaga a lista de documentos de todos os anúncios):
-- ALTER TABLE public.sale_listings DROP CONSTRAINT IF EXISTS sale_listings_documents_is_array;
-- ALTER TABLE public.sale_listings DROP COLUMN IF EXISTS documents, DROP COLUMN IF EXISTS energy_cert_public;
