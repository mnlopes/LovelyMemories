
-- Migration to add highlights_intro column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS highlights_intro JSONB DEFAULT '{"en": "", "pt": "", "he": ""}'::jsonb;

-- Comment to explain the purpose
COMMENT ON COLUMN public.properties.highlights_intro IS 'Stores translated introduction text for the Highlights section (What to expect).';
