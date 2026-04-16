-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  size_selected TEXT NOT NULL CHECK (size_selected IN ('Regular','Big','Jumbo')),
  scent_profile TEXT NOT NULL CHECK (scent_profile IN ('Classic','Fresh','Gentle')),
  dry_cleaning_items INTEGER NOT NULL DEFAULT 0 CHECK (dry_cleaning_items >= 0),
  comforters INTEGER NOT NULL DEFAULT 0 CHECK (comforters >= 0),
  pickup_date DATE NOT NULL,
  pickup_time TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  hold_amount NUMERIC(10,2),
  auth_expiry_date TIMESTAMP WITH TIME ZONE,
  order_status TEXT NOT NULL DEFAULT 'pending',
  actual_weight NUMERIC(10,2),
  final_captured_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_confirmation_number ON public.bookings(confirmation_number);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a booking (public form)
CREATE POLICY "Anyone can create a booking"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can read a booking (confirmation page looks it up by confirmation_number)
CREATE POLICY "Anyone can read bookings"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (true);