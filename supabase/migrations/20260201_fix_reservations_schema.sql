
-- SQL to fix and update the reservations table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

ALTER TABLE public.reservations 
RENAME COLUMN reference TO reference_id;

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS arrival_time TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Verify columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations';
