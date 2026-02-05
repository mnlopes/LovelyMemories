
-- Expand reservations table to include all financial and guest details
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS breakfast_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT,
ADD COLUMN IF NOT EXISTS billing_vat TEXT;

-- Arrival time is already in migration 20260201_fix_reservations_schema.sql as TEXT
-- but let's ensure it's there for consistency if we missed a run
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS arrival_time TEXT;

-- Verify columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations';
