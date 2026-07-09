
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1
  CHECK (quantity >= 1 AND quantity <= 100);

CREATE OR REPLACE FUNCTION public.approve_order(_order_id uuid, _note text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, delivered boolean, out_of_stock boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  ord public.orders%ROWTYPE;
  picked_ids uuid[];
  picked_contents text[];
  need int;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF ord.status <> 'pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;

  need := COALESCE(ord.quantity, 1);

  IF ord.item_kind = 'product' THEN
    WITH picked AS (
      SELECT id, content
        FROM public.product_stock_items
       WHERE product_id = ord.item_id AND status = 'available'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT need
    ),
    upd AS (
      UPDATE public.product_stock_items s
         SET status = 'sold', assigned_order_id = _order_id, sold_at = now()
        FROM picked p
       WHERE s.id = p.id
       RETURNING s.id, s.content
    )
    SELECT array_agg(id), array_agg(content) INTO picked_ids, picked_contents FROM upd;

    IF picked_ids IS NULL OR array_length(picked_ids, 1) < need THEN
      -- Not enough stock: rollback and signal
      RAISE EXCEPTION 'OUT_OF_STOCK';
    END IF;

    UPDATE public.orders
       SET status = 'approved',
           admin_note = _note,
           reviewed_by = uid,
           reviewed_at = now(),
           delivered_content = array_to_string(picked_contents, E'\n'),
           stock_item_id = picked_ids[1]
     WHERE id = _order_id;

    RETURN QUERY SELECT _order_id, true, false;
    RETURN;
  ELSE
    UPDATE public.orders
       SET status = 'approved',
           admin_note = _note,
           reviewed_by = uid,
           reviewed_at = now()
     WHERE id = _order_id;
    RETURN QUERY SELECT _order_id, true, false;
    RETURN;
  END IF;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'OUT_OF_STOCK' THEN
    RETURN QUERY SELECT _order_id, false, true;
    RETURN;
  END IF;
  RAISE;
END;
$function$;
