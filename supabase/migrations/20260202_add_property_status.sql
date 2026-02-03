-- Add status column to properties table
-- Possible values: 'active', 'coming_soon', 'hidden'

DO $$ 
BEGIN
    -- 1. Add the status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'status') THEN
        ALTER TABLE public.properties ADD COLUMN status TEXT DEFAULT 'active';
        
        -- Add check constraint
        ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
            CHECK (status IN ('active', 'coming_soon', 'hidden'));
    END IF;

    -- 2. Migrate data from is_active
    -- active = true -> 'active'
    -- active = false -> 'coming_soon' (legacy behavior)
    UPDATE public.properties 
    SET status = 'active' 
    WHERE is_active = true AND status = 'active';

    UPDATE public.properties 
    SET status = 'coming_soon' 
    WHERE is_active = false;

    -- 3. We keep is_active for now to avoid breaking existing queries immediately, 
    -- but we'll sync it: is_active is true ONLY if status is 'active'
    -- Actually, it's safer to just let the app handle the logic for a bit.

END $$;
