-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_date ON public.bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_bookings_order_status ON public.bookings(order_status);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_number ON public.bookings(confirmation_number);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings(phone);

-- Unique constraint on confirmation_number (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_confirmation_number'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT unique_confirmation_number UNIQUE (confirmation_number);
  END IF;
END$$;

-- Rate limit table (server-only)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service role (server) can read/write.
-- (Service role bypasses RLS, so leaving the table without policies fully locks it down for clients.)

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_started_at);