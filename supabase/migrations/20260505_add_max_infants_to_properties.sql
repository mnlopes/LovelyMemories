-- Add max_infants column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_infants INTEGER DEFAULT 0;
