-- Add Hebrew support to concierge_services
ALTER TABLE public.concierge_services 
ADD COLUMN IF NOT EXISTS name_he TEXT,
ADD COLUMN IF NOT EXISTS description_he TEXT;

-- Update existing services with placeholder Hebrew names (optional but helpful)
UPDATE public.concierge_services SET name_he = name_en WHERE name_he IS NULL;
UPDATE public.concierge_services SET description_he = description_en WHERE description_he IS NULL;
