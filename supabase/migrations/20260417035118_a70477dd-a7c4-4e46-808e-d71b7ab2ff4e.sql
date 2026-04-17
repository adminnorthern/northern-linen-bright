-- Grant admin role to the owner user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'info@northernlinen.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also reset password to AllPro84$ for that user
UPDATE auth.users
SET encrypted_password = crypt('AllPro84$', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'info@northernlinen.com';