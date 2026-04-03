-- Adicionar suporte para múltiplos URLs de importação iCal por propriedade
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ical_import_urls JSONB DEFAULT '[]'::jsonb;

-- Adicionar tracking de origem aos blocked_dates
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Opcional: criar índice para external_id para evitar duplicações/queries lentas no import
CREATE INDEX IF NOT EXISTS idx_blocked_dates_external_id ON blocked_dates(external_id);
