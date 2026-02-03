-- Add vip_services column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vip_services JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN properties.vip_services IS 'List of VIP services for the property, each with a localized title and optional icon.';
