-- Proíbe duas reservas ativas sobrepostas na mesma casa (auditoria 2026-11-13, L-3).
--
-- ⚠️ SÓ APLICAR DEPOIS de o código do L-3 estar em produção. O código novo trata o erro desta
-- regra (23P01): um pagamento já feito fica "Em revisão" (needs_review) e a equipa é avisada.
-- O código antigo não o trata: o webhook da Stripe falharia e o hóspede ficava com o pagamento
-- feito e sem reserva.
--
-- O que a regra faz: para cada casa, as estadias [check_in, check_out) das reservas com estado
-- 'pending' ou 'confirmed' não se podem sobrepor (sair e entrar no mesmo dia não é sobreposição).
-- Fecha o caso de dois pagamentos gravados ao mesmo tempo, que a verificação no código não apanha.
--
-- Fora da regra, de propósito:
--   - 'cancelled';
--   - 'needs_review': reserva paga em datas ocupadas, à espera da decisão da equipa;
--   - 'completed': as importações do CSV do Airbnb (há 2 sobreposições antigas entre elas, em
--     agosto de 2026, que impediriam criar a regra) e estadias já terminadas.
--
-- Não apaga nem altera nenhuma reserva. Em 15/11/2026 não havia nenhuma sobreposição entre
-- reservas 'pending'/'confirmed', por isso a regra é criada sem erros.
--
-- Aplicar à mão no SQL Editor da Supabase.

BEGIN;

-- Permite usar "property_id WITH =" (uuid) numa regra GiST.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
        property_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
    )
    WHERE (status IN ('pending', 'confirmed'));

COMMIT;

-- Verificação (não toca em nenhuma reserva). Deve devolver 1 linha com a regra:
--   EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out, '[)'::text) WITH &&)
--   WHERE ((status = ANY (ARRAY['pending'::text, 'confirmed'::text])))
SELECT conname AS regra, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'public.reservations'::regclass AND conname = 'reservations_no_overlap';

-- Para voltar atrás:
-- ALTER TABLE public.reservations DROP CONSTRAINT reservations_no_overlap;
