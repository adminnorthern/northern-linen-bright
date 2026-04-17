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