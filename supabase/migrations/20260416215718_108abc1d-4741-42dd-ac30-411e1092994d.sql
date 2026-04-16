-- Drop overly permissive public SELECT
DROP POLICY IF EXISTS "Anyone can read bookings" ON public.bookings;

-- Secure lookup: returns one booking only when caller provides the exact confirmation number.
CREATE OR REPLACE FUNCTION public.get_booking_by_confirmation(_confirmation_number TEXT)
RETURNS TABLE (
  confirmation_number TEXT,
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  size_selected TEXT,
  scent_profile TEXT,
  dry_cleaning_items INTEGER,
  comforters INTEGER,
  pickup_date DATE,
  pickup_time TEXT,
  order_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.confirmation_number,
    b.customer_name,
    b.email,
    b.phone,
    b.street_address,
    b.city,
    b.state,
    b.zip,
    b.size_selected,
    b.scent_profile,
    b.dry_cleaning_items,
    b.comforters,
    b.pickup_date,
    b.pickup_time,
    b.order_status,
    b.created_at
  FROM public.bookings b
  WHERE b.confirmation_number = _confirmation_number
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_confirmation(TEXT) TO anon, authenticated;