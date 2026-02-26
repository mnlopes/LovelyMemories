-- 1. Add 'owner' to the existing enum type
-- This must be run OUTSIDE a transaction block if you are using a migration tool that wraps everything in transactions.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Add owner_id to properties table (if not already added)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 3. Create an index for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
