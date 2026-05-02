
-- Add locale column to reservations to track which language the guest used
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt';

-- Add comment for clarity
COMMENT ON COLUMN public.reservations.locale IS 'The language used by the guest during checkout (e.g., pt, en)';
