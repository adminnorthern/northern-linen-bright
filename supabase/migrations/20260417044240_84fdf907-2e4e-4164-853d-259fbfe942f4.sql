ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owner can claim admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'::public.app_role
  AND coalesce(auth.jwt()->>'email', '') = 'info@northernlinen.com'
);

CREATE OR REPLACE FUNCTION public.claim_owner_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  current_user_id := auth.uid();
  current_user_email := coalesce(auth.jwt()->>'email', '');

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF current_user_email <> 'info@northernlinen.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_owner_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin_role() TO authenticated;