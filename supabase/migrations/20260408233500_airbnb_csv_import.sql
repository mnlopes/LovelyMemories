-- Migration to add Airbnb CSV Import support

-- 1. Create import_history table to track uploads
CREATE TABLE IF NOT EXISTS public.import_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename TEXT NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    imported_by UUID, -- Reference added via separate constraint for naming
    total_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    CONSTRAINT import_history_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Index for performance on sorting
CREATE INDEX IF NOT EXISTS import_history_imported_at_idx ON public.import_history (imported_at DESC);

-- 2. Update properties table (listing name mapping)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS airbnb_listing_name TEXT;

-- 3. Update reservations table (financial tracking)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS external_confirmation_code TEXT,
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_date DATE,
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_history(id) ON DELETE SET NULL;

-- 4. Add unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS reservations_external_code_idx 
ON public.reservations (property_id, external_confirmation_code) 
WHERE external_confirmation_code IS NOT NULL;

-- 5. RLS for import_history (Security & RBAC)
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Policy for Select (Admins and Super Admins)
CREATE POLICY "Admins can view import history" 
ON public.import_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('super_admin', 'admin')
  )
);

-- Policy for Insert (Admins and Super Admins)
CREATE POLICY "Admins can insert import history" 
ON public.import_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('super_admin', 'admin')
  )
);

-- Policy for Delete (Admins and Super Admins)
CREATE POLICY "Admins can delete import history" 
ON public.import_history FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('super_admin', 'admin')
  )
);
