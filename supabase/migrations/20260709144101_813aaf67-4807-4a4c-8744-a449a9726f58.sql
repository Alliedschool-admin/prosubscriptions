CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
 RETURNS TABLE(user_id uuid, email text, granted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  target uuid;
  target_email text;
  inserted_rows int := 0;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT u.id, u.email
    INTO target, target_email
    FROM auth.users u
   WHERE lower(u.email) = lower(trim(_email))
   LIMIT 1;

  IF target IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', _email;
  END IF;

  WITH ins AS (
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted_rows FROM ins;

  RETURN QUERY SELECT target, target_email, (inserted_rows > 0);
END;
$function$;