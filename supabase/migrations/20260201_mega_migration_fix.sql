-- MEGA MIGRATION: Garante que TODAS as colunas necessárias existem na tabela properties
-- Este comando adiciona todas as colunas em falta de uma só vez para evitar erros individuais.

ALTER TABLE public.properties 
-- Identidade e Conteúdo
ADD COLUMN IF NOT EXISTS title JSONB DEFAULT '{"en": "", "pt": ""}',
ADD COLUMN IF NOT EXISTS subtitle JSONB DEFAULT '{"en": "", "pt": ""}',
ADD COLUMN IF NOT EXISTS description JSONB DEFAULT '{"en": "", "pt": ""}',
-- Localização e GPS
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
-- Detalhes da Casa
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS area DOUBLE PRECISION DEFAULT 0,
-- Preços
ADD COLUMN IF NOT EXISTS price_per_night DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price DOUBLE PRECISION,
-- Media e Configurações JSONB
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS nearby_places JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS floor_plan_url TEXT,
-- Flags e Tipos
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'apartment',
-- Hierarquia
ADD COLUMN IF NOT EXISTS is_multi_unit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.properties(id);

-- Índices extra para performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_parent_id ON public.properties(parent_id);
