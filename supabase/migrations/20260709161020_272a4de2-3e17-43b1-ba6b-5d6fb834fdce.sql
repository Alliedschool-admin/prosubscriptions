CREATE OR REPLACE FUNCTION public.invite_admin_by_email(_email text)
RETURNS TABLE(email text, granted boolean, invited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  normalized text := lower(trim(_email));
  target uuid;
  inserted_role int := 0;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'super_admin') THEN
    RAISE EXCEPTION 'Only the super admin can invite admins';
  END IF;

  IF normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT u.id INTO target
    FROM auth.users u
   WHERE lower(u.email) = normalized
   LIMIT 1;

  IF target IS NOT NULL THEN
    WITH ins AS (
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO inserted_role FROM ins;

    DELETE FROM public.admin_invites ai WHERE ai.email = normalized;

    RETURN QUERY SELECT normalized, (inserted_role > 0), false;
    RETURN;
  END IF;

  INSERT INTO public.admin_invites AS ai (email, invited_by)
  VALUES (normalized, caller)
  ON CONFLICT ON CONSTRAINT admin_invites_pkey
  DO UPDATE SET invited_by = EXCLUDED.invited_by, created_at = now();

  RETURN QUERY SELECT normalized, false, true;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_admin_invite_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text := lower(NEW.email);
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_invites ai WHERE ai.email = normalized) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.admin_invites ai WHERE ai.email = normalized;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_admin_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_admin_invites() FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.invite_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_invite(text) TO authenticated;