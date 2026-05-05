-- Adiciona a coluna extra_guests à tabela reservations
-- Este array guardará os nomes dos hóspedes adicionais para efeitos de comunicação ao SEF.
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS extra_guests text[] DEFAULT '{}'::text[];
