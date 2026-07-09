
CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  phone text,
  full_name text,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean,
  order_count bigint,
  total_spent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(u.phone::text, (u.raw_user_meta_data->>'phone')::text),
    COALESCE(
      (u.raw_user_meta_data->>'full_name'),
      (u.raw_user_meta_data->>'name'),
      trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name'))
    ),
    COALESCE(u.raw_app_meta_data->>'provider', 'email')::text,
    u.created_at,
    u.last_sign_in_at,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    COALESCE((SELECT count(*) FROM public.orders o WHERE o.buyer_id = u.id), 0),
    COALESCE((SELECT sum(o.amount) FROM public.orders o WHERE o.buyer_id = u.id AND o.status = 'approved'), 0)
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users() TO authenticated;
