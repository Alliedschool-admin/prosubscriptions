
CREATE TABLE public.admin_invites (
  email text PRIMARY KEY,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invites"
  ON public.admin_invites FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Invite by email: grant immediately if user exists, otherwise queue as invite.
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
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT u.id INTO target FROM auth.users u WHERE lower(u.email) = normalized LIMIT 1;

  IF target IS NOT NULL THEN
    WITH ins AS (
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO inserted_role FROM ins;

    DELETE FROM public.admin_invites WHERE email = normalized;

    RETURN QUERY SELECT normalized, (inserted_role > 0), false;
    RETURN;
  END IF;

  INSERT INTO public.admin_invites (email, invited_by)
  VALUES (normalized, caller)
  ON CONFLICT (email) DO UPDATE SET invited_by = EXCLUDED.invited_by, created_at = now();

  RETURN QUERY SELECT normalized, false, true;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_invites()
RETURNS TABLE(email text, created_at timestamptz, invited_by_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT i.email, i.created_at, u.email::text
    FROM public.admin_invites i
    LEFT JOIN auth.users u ON u.id = i.invited_by
    ORDER BY i.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_invite(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.admin_invites WHERE email = lower(trim(_email));
  RETURN TRUE;
END;
$$;

-- Auto-grant admin when an invited email signs up or confirms.
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
     AND EXISTS (SELECT 1 FROM public.admin_invites WHERE email = normalized) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.admin_invites WHERE email = normalized;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_consume_admin_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_consume_admin_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.consume_admin_invite_on_signup();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_consume_admin_invite ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_consume_admin_invite
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.consume_admin_invite_on_signup();
