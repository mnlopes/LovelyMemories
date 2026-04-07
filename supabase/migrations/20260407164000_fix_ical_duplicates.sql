-- Migration to prevent iCal duplicates by adding a unique constraint
-- and also cleaning up any remaining duplicates before applying

-- 1. Ensure any remaining duplicates are handled (though script should have already caught them)
-- In case of multiple records for same external_id, we keep the one with earlier start_date
DELETE FROM blocked_dates a
USING blocked_dates b
WHERE a.id > b.id
  AND a.property_id = b.property_id
  AND a.external_id = b.external_id
  AND a.external_id IS NOT NULL;

-- 2. Add the unique constraint
-- This will allow .upsert() to correctly update instead of insert
ALTER TABLE blocked_dates 
ADD CONSTRAINT unique_property_external_id UNIQUE (property_id, external_id);

-- 3. Comment explaining the constraint
COMMENT ON CONSTRAINT unique_property_external_id ON blocked_dates IS 'Prevents duplicate iCal blocks for the same property and UID';
