-- Adicionar tracking de sincronização iCal à tabela properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'unknown'; -- 'success', 'failed', 'unknown'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
