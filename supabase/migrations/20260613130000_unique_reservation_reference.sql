-- INTEGRITY: enforce uniqueness of reservations.reference_id.
-- =====================================================================
-- finalizeBooking() de-duplicates with a SELECT-then-INSERT, which has a race
-- window: the Stripe webhook and the manual confirmStripePaymentIntent can run
-- concurrently and create two rows for the same booking. A DB-level UNIQUE index
-- closes that window for good.
--
-- reference_id can be NULL for some imported reservations (those use
-- external_confirmation_code instead), so we use a partial index over the
-- non-null values.

-- Fail loudly if duplicates already exist, so they are fixed deliberately
-- instead of silently corrupting data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.reservations
        WHERE reference_id IS NOT NULL
        GROUP BY reference_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate reference_id values exist in reservations. Resolve them before applying the unique index.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_reference_id
    ON public.reservations (reference_id)
    WHERE reference_id IS NOT NULL;
