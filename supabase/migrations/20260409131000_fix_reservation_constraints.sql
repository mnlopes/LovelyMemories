-- Migration to fix reservation unique constraints for Airbnb imports
-- This drops the strict global unique constraint on reference_id (renamed from reference)
-- allowing the .upsert() call in the importer (which targets property_id, external_confirmation_code)
-- to work correctly even if reference_id conflicts.

DO $$ 
BEGIN
    -- 1. Drop the legacy unique constraint if it exists
    -- The name 'reservations_reference_key' is the standard PostgreSQL name for a UNIQUE(reference) constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_reference_key') THEN
        ALTER TABLE public.reservations DROP CONSTRAINT reservations_reference_key;
    END IF;

    -- 2. Drop unique index if it exists under that name
    DROP INDEX IF EXISTS reservations_reference_key;

    -- 3. Ensure we have an index on reference_id for performance (but non-unique)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservations_reference_id') THEN
        CREATE INDEX idx_reservations_reference_id ON public.reservations (reference_id);
    END IF;
END $$;

-- 4. Audit Log
COMMENT ON INDEX public.idx_reservations_reference_id IS 'Non-unique index for reservation reference lookups, allowing per-property external code uniqueness to lead.';
