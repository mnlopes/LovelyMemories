-- Create locked_dates table for temporary reservation locking
CREATE TABLE IF NOT EXISTS public.locked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    session_id TEXT NOT NULL,
    is_extended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for performance on availability checks
CREATE INDEX IF NOT EXISTS idx_locked_dates_property_dates ON public.locked_dates (property_id, check_in, check_out);

-- Index for session cleanup/extension
CREATE INDEX IF NOT EXISTS idx_locked_dates_session_id ON public.locked_dates (session_id);

-- RLS (Row Level Security)
ALTER TABLE public.locked_dates ENABLE ROW LEVEL SECURITY;

-- Allow public read so availability checks can see them
CREATE POLICY "Allow public read on locked_dates"
ON public.locked_dates FOR SELECT
USING (true);

-- Note: Insert/Update/Delete should be handled via service role/admin client in server actions
