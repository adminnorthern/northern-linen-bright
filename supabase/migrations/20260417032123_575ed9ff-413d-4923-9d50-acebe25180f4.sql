-- 1. Roles enum + table + has_role function (industry-standard pattern)
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. App settings (pricing) — single-row-per-key
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value) VALUES
  ('price_per_lb', 2.50),
  ('price_per_dry_clean', 10.00),
  ('price_per_comforter', 40.00);

CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Supplies inventory
CREATE TABLE public.supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_threshold INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

INSERT INTO public.supplies (name, current_stock, minimum_threshold, sort_order) VALUES
  ('Branded laundry bags', 100, 20, 1),
  ('Thank you cards', 200, 50, 2),
  ('Tissue paper', 200, 20, 3),
  ('Clothing labels', 500, 20, 4),
  ('Rubber bands', 1000, 20, 5),
  ('Garment tags', 500, 20, 6),
  ('Safety pins', 50, 20, 7),
  ('Sharpies', 12, 10, 8),
  ('Laundry carts', 2, 2, 9),
  ('Shelving units', 1, 1, 10);

CREATE POLICY "Admins can view supplies"
ON public.supplies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplies"
ON public.supplies FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Add SMS/email status columns to bookings (Day 4 carryover)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sms_1_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sms_2_status TEXT NOT NULL DEFAULT 'not_sent_yet',
  ADD COLUMN IF NOT EXISTS receipt_email_status TEXT NOT NULL DEFAULT 'pending';

-- 5. Admin RLS on bookings (currently no SELECT/UPDATE policies exist)
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_supplies_touch BEFORE UPDATE ON public.supplies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();