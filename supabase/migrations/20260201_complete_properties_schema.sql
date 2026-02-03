
-- SQL to add missing columns to the properties table
-- This will allow storing highlights and nearby places directly in the DB
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS nearby_places JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]';

-- Note: 'room_config' already exists, but we're adding 'rooms' 
-- to match the Property interface exactly and simplify the code.

-- Verify columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties';
