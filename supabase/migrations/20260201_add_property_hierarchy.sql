-- Add hierarchy support for Buildings vs Units
-- 1. parent_id: If set, this property belongs to another property (e.g. an Apartment inside a Building).
-- 2. is_multi_unit: If true, this property is a container/building that has multiple units inside.

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.properties(id),
ADD COLUMN IF NOT EXISTS is_multi_unit BOOLEAN DEFAULT false;

-- Add index for performance when fetching children
CREATE INDEX IF NOT EXISTS idx_properties_parent_id ON public.properties(parent_id);

-- Policies
-- Ensure children are visible if parent is visible (simplified for now, relying on existing public access)
