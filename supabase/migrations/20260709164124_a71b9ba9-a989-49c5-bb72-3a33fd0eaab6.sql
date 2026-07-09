DROP FUNCTION IF EXISTS public.claim_free_product(text);

CREATE OR REPLACE FUNCTION public.claim_free_product(_product_id text)
 RETURNS TABLE(order_id uuid, already_owned boolean, out_of_stock boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  prod public.products%ROWTYPE;
  existing_id uuid;
  new_id uuid;
  buyer_name text;
  buyer_email text;
  picked_id uuid;
  picked_content text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;

  SELECT * INTO prod FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF NOT prod.is_free THEN RAISE EXCEPTION 'This product is not free'; END IF;

  SELECT id INTO existing_id FROM public.orders
   WHERE buyer_id = uid AND item_kind = 'product' AND item_id = _product_id
     AND status = 'approved'
   ORDER BY created_at DESC LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_id, true, false; RETURN;
  END IF;

  SELECT s.id, s.content INTO picked_id, picked_content
    FROM public.product_stock_items s
   WHERE s.product_id = _product_id AND s.status = 'available'
   ORDER BY s.created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF picked_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, true; RETURN;
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name', email), email
    INTO buyer_name, buyer_email FROM auth.users WHERE id = uid;

  INSERT INTO public.orders (
    buyer_id, item_kind, item_id, item_name, amount, currency, quantity,
    sender_name, sender_contact, status, delivered_content,
    reviewed_at, stock_item_id
  ) VALUES (
    uid, 'product', prod.id, prod.name, 0, 'USD', 1,
    COALESCE(buyer_name, 'Free claim'), COALESCE(buyer_email, ''),
    'approved', picked_content, now(), picked_id
  ) RETURNING id INTO new_id;

  UPDATE public.product_stock_items
     SET status = 'sold', assigned_order_id = new_id, sold_at = now()
   WHERE id = picked_id;

  RETURN QUERY SELECT new_id, false, false;
END; $function$;