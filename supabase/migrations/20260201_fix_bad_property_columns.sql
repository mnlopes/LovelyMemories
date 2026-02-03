-- Fix incorrect column types for numeric fields
-- This script converts bedrooms, beds, bathrooms, max_guests, and price_per_night to their correct types
-- It handles cases where they might be stored as JSONB localized objects (e.g. {"en": "2"})

DO $$ 
BEGIN 
    -- 1. Fix 'bedrooms' (Target: INTEGER)
    BEGIN
        -- First optimize the current data to be castable
        -- Note: We can't use ALTER COLUMN ... USING directly if the column type is very different in a way that Postgres dislikes without explicit cast
        
        -- Strategy: Update the column in-place if possible, or ALTER it.
        -- If it's currently JSONB:
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bedrooms' AND data_type = 'jsonb') THEN
            ALTER TABLE public.properties 
            ALTER COLUMN bedrooms TYPE INTEGER USING (
                COALESCE(
                    (bedrooms->>'en')::integer,
                    (bedrooms->>'pt')::integer, 
                    (bedrooms->>'he')::integer,
                    0
                )
            );
        -- If it's TEXT/VARCHAR:
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bedrooms' AND data_type IN ('text', 'character varying')) THEN
             ALTER TABLE public.properties 
             ALTER COLUMN bedrooms TYPE INTEGER USING (NULLIF(bedrooms, '')::integer);
        END IF;

    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error fixing bedrooms: %', SQLERRM;
    END;

    -- 2. Fix 'beds' (Target: INTEGER)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'beds' AND data_type = 'jsonb') THEN
            ALTER TABLE public.properties 
            ALTER COLUMN beds TYPE INTEGER USING (
                COALESCE(
                    (beds->>'en')::integer,
                    (beds->>'pt')::integer,
                    0
                )
            );
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'beds' AND data_type IN ('text', 'character varying')) THEN
             ALTER TABLE public.properties 
             ALTER COLUMN beds TYPE INTEGER USING (NULLIF(beds, '')::integer);
        END IF;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error fixing beds: %', SQLERRM;
    END;

    -- 3. Fix 'bathrooms' (Target: INTEGER)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bathrooms' AND data_type = 'jsonb') THEN
            ALTER TABLE public.properties 
            ALTER COLUMN bathrooms TYPE INTEGER USING (
                COALESCE(
                    (bathrooms->>'en')::integer,
                    (bathrooms->>'pt')::integer,
                    0
                )
            );
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bathrooms' AND data_type IN ('text', 'character varying')) THEN
             ALTER TABLE public.properties 
             ALTER COLUMN bathrooms TYPE INTEGER USING (NULLIF(bathrooms, '')::integer);
        END IF;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error fixing bathrooms: %', SQLERRM;
    END;

    -- 4. Fix 'max_guests' (Target: INTEGER)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'max_guests' AND data_type = 'jsonb') THEN
            ALTER TABLE public.properties 
            ALTER COLUMN max_guests TYPE INTEGER USING (
                COALESCE(
                    (max_guests->>'en')::integer,
                    (max_guests->>'pt')::integer,
                    0
                )
            );
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'max_guests' AND data_type IN ('text', 'character varying')) THEN
             ALTER TABLE public.properties 
             ALTER COLUMN max_guests TYPE INTEGER USING (NULLIF(max_guests, '')::integer);
        END IF;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error fixing max_guests: %', SQLERRM;
    END;

    -- 5. Fix 'price_per_night' (Target: DECIMAL/NUMERIC)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_per_night' AND data_type = 'jsonb') THEN
            ALTER TABLE public.properties 
            ALTER COLUMN price_per_night TYPE NUMERIC USING (
                COALESCE(
                    (price_per_night->>'en')::numeric,
                    0
                )
            );
        END IF;
    END;

END $$;
