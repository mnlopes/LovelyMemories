
-- Adicionar coluna city_tax_per_night à tabela pricing_rules
ALTER TABLE public.pricing_rules 
ADD COLUMN IF NOT EXISTS city_tax_per_night DECIMAL(5, 2) DEFAULT 2.00;

-- Adicionar coluna city_tax_total à tabela reservations per histórico de faturação
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS city_tax_total DECIMAL(10, 2) DEFAULT 0;

-- Comentários para documentação do esquema
COMMENT ON COLUMN public.pricing_rules.city_tax_per_night IS 'Valor da taxa turística por noite, por hóspede (geralmente €2 no Porto)';
COMMENT ON COLUMN public.reservations.city_tax_total IS 'Valor total da taxa turística cobrada nesta reserva';
