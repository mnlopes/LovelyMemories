
-- 1. Tabela de Regras de Preços (Configurações Gerais por Propriedade)
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- Preços e Taxas
    base_price_per_night DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cleaning_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Regras de Reserva
    min_nights INTEGER NOT NULL DEFAULT 2,
    
    -- Descontos Standard (5% semanal, 15% mensal)
    weekly_discount_percent DECIMAL(5, 2) DEFAULT 5.00,
    monthly_discount_percent DECIMAL(5, 2) DEFAULT 15.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(property_id)
);

-- 2. Tabela de Preços Personalizados (Sazonais/Eventos)
CREATE TABLE IF NOT EXISTS public.custom_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    
    reason TEXT, -- Ex: "Natal", "Agosto", "Web Summit"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que o fim é depois do início
    CONSTRAINT check_dates CHECK (end_date > start_date)
);

-- 3. Tabela de Datas Bloqueadas (Admin/Owners)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    reason TEXT NOT NULL, -- Ex: "Manutenção", "Uso do Proprietário"
    blocked_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_blocked_dates CHECK (end_date > start_date)
);

-- Habilitar RLS
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Políticas: Leitura Pública (necessário para o checkout calcular), Escrita apenas Admin
CREATE POLICY "Leitura pública de regras de preço" ON public.pricing_rules FOR SELECT USING (true);
CREATE POLICY "Leitura pública de preços customizados" ON public.custom_pricing FOR SELECT USING (true);
CREATE POLICY "Leitura pública de datas bloqueadas" ON public.blocked_dates FOR SELECT USING (true);

-- Nota: Assumimos que existe uma role 'admin' ou 'super_admin' no sistema de perfis.
-- Como as ações de escrita virão de Server Actions com Service Role, estas políticas de admin
-- são mais uma camada de segurança mas o Service Role ignora RLS por padrão.

-- Inserir dados iniciais de pricing_rules baseados nos preços atuais da tabela properties
INSERT INTO public.pricing_rules (property_id, base_price_per_night, cleaning_fee)
SELECT id, price_per_night, 85 FROM public.properties
ON CONFLICT (property_id) DO NOTHING;
