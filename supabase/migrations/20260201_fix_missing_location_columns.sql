-- SQL to add missing location and mapping columns to the properties table
-- This is necessary to fix the "Could not find the 'address' column" error

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

-- Verify columns (Optional - run manually to check)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties';
