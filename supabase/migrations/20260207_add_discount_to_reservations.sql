
-- Adicionar coluna discount_amount à tabela reservations para auditoria e histórico
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Comentário para documentação do esquema
COMMENT ON COLUMN public.reservations.discount_amount IS 'Valor do desconto aplicado (semanal ou mensal) no momento da reserva';
