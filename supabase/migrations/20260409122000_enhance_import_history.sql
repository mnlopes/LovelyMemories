-- Migration to enhance import_history table with target period and property association
ALTER TABLE public.import_history 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_month INTEGER,
ADD COLUMN IF NOT EXISTS target_year INTEGER;

-- Update existing records - attempt to extract property_id from reservations
-- This is a best-effort update for existing data
UPDATE public.import_history h
SET property_id = (
    SELECT property_id 
    FROM public.reservations r 
    WHERE r.import_batch_id = h.id 
    LIMIT 1
)
WHERE property_id IS NULL;
