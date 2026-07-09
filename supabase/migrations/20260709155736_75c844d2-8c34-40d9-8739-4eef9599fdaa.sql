
-- Promote first admin to super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'super_admin'::public.app_role
  FROM public.user_roles ur
 WHERE ur.role = 'admin'
   AND ur.created_at = (SELECT min(created_at) FROM public.user_roles WHERE role='admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Invite/revoke restricted to super_admin
CREATE OR REPLACE FUNCTION public.invite_admin_by_email(_email text)
 RETURNS TABLE(email text, granted boolean, invited boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  SELECT u.id INTO target FROM auth.users u WHERE lower(u.email) = normalized LIMIT 1;
  IF target IS NOT NULL THEN
    WITH ins AS (
      INSERT INTO public.user_roles (user_id, role) VALUES (target, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING RETURNING 1
    ) SELECT count(*) INTO inserted_role FROM ins;
    DELETE FROM public.admin_invites WHERE email = normalized;
    RETURN QUERY SELECT normalized, (inserted_role > 0), false; RETURN;
  END IF;
  INSERT INTO public.admin_invites (email, invited_by) VALUES (normalized, caller)
  ON CONFLICT (email) DO UPDATE SET invited_by = EXCLUDED.invited_by, created_at = now();
  RETURN QUERY SELECT normalized, false, true;
END; $function$;

CREATE OR REPLACE FUNCTION public.revoke_admin(_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super admin can remove admins';
  END IF;
  IF public.has_role(_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'The super admin cannot be removed';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  RETURN TRUE;
END; $function$;

CREATE OR REPLACE FUNCTION public.revoke_admin_invite(_email text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super admin can cancel invites';
  END IF;
  DELETE FROM public.admin_invites WHERE email = lower(trim(_email));
  RETURN TRUE;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_invites()
 RETURNS TABLE(email text, created_at timestamp with time zone, invited_by_email text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super admin can view invites';
  END IF;
  RETURN QUERY
  SELECT i.email, i.created_at, u.email::text
    FROM public.admin_invites i LEFT JOIN auth.users u ON u.id = i.invited_by
    ORDER BY i.created_at DESC;
END; $function$;

-- Add is_super flag to list_admins
DROP FUNCTION IF EXISTS public.list_admins();
CREATE FUNCTION public.list_admins()
 RETURNS TABLE(user_id uuid, email text, granted_at timestamp with time zone, is_super boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT ur.user_id, u.email::text, min(ur.created_at) AS granted_at,
         bool_or(ur.role = 'super_admin') AS is_super
    FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id
   WHERE ur.role IN ('admin','super_admin')
   GROUP BY ur.user_id, u.email
   ORDER BY min(ur.created_at) ASC;
END; $function$;

-- Free products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.products_require_price()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_free IS TRUE THEN
    NEW.price := 0; NEW.price_usd := 0; NEW.price_pkr := 0;
    RETURN NEW;
  END IF;
  IF (NEW.price_usd IS NULL OR NEW.price_usd <= 0)
     AND (NEW.price_pkr IS NULL OR NEW.price_pkr <= 0) THEN
    RAISE EXCEPTION 'A product must have a USD price, a PKR price, or both';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.claim_free_product(_product_id text)
 RETURNS TABLE(order_id uuid, already_owned boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  prod public.products%ROWTYPE;
  existing_id uuid;
  new_id uuid;
  buyer_name text;
  buyer_email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO prod FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF NOT prod.is_free THEN RAISE EXCEPTION 'This product is not free'; END IF;

  SELECT id INTO existing_id FROM public.orders
   WHERE buyer_id = uid AND item_kind = 'product' AND item_id = _product_id
   ORDER BY created_at DESC LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_id, true; RETURN;
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name', email), email
    INTO buyer_name, buyer_email FROM auth.users WHERE id = uid;

  INSERT INTO public.orders (
    buyer_id, item_kind, item_id, item_name, amount, currency, quantity,
    sender_name, sender_contact, status, delivered_content, reviewed_at
  ) VALUES (
    uid, 'product', prod.id, prod.name, 0, 'USD', 1,
    COALESCE(buyer_name, 'Free claim'), COALESCE(buyer_email, ''),
    'approved', COALESCE(prod.delivery_instructions, 'Free product — enjoy!'), now()
  ) RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, false;
END; $function$;

CREATE OR REPLACE FUNCTION public.product_purchase_counts()
 RETURNS TABLE(product_id text, purchase_count bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT o.item_id AS product_id, count(*)::bigint
      FROM public.orders o
     WHERE o.item_kind = 'product' AND o.status = 'approved'
     GROUP BY o.item_id;
END; $function$;

REVOKE ALL ON FUNCTION public.claim_free_product(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.product_purchase_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_free_product(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_purchase_counts() TO authenticated;
