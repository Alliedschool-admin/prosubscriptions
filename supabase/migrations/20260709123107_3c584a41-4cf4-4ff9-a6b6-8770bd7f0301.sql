
-- Stock items = pool of delivery links/codes for each digital product
CREATE TYPE public.stock_status AS ENUM ('available', 'sold');

CREATE TABLE public.product_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  status public.stock_status NOT NULL DEFAULT 'available',
  assigned_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX product_stock_items_product_status_idx
  ON public.product_stock_items(product_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock_items TO authenticated;
GRANT ALL ON public.product_stock_items TO service_role;

ALTER TABLE public.product_stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock items"
  ON public.product_stock_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Denormalized available-stock count on products (public, so buyers see it)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_stock integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_product_stock_count(_product_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
     SET available_stock = (
       SELECT count(*) FROM public.product_stock_items
       WHERE product_id = _product_id AND status = 'available'
     )
   WHERE id = _product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_product_stock_count(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.product_stock_items_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_product_stock_count(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_product_stock_count(NEW.product_id);
    IF TG_OP = 'UPDATE' AND OLD.product_id <> NEW.product_id THEN
      PERFORM public.refresh_product_stock_count(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.product_stock_items_after_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS product_stock_items_after_change_trg ON public.product_stock_items;
CREATE TRIGGER product_stock_items_after_change_trg
AFTER INSERT OR UPDATE OR DELETE ON public.product_stock_items
FOR EACH ROW EXECUTE FUNCTION public.product_stock_items_after_change();

-- Backfill counts (currently zero)
UPDATE public.products p
   SET available_stock = COALESCE((
     SELECT count(*) FROM public.product_stock_items s
     WHERE s.product_id = p.id AND s.status = 'available'), 0);

-- Delivered content on the order (link or code) for the buyer to see
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_content text,
  ADD COLUMN IF NOT EXISTS stock_item_id uuid REFERENCES public.product_stock_items(id) ON DELETE SET NULL;

-- Approve an order atomically: pick one available stock item, deliver it
CREATE OR REPLACE FUNCTION public.approve_order(_order_id uuid, _note text DEFAULT NULL)
RETURNS TABLE(order_id uuid, delivered boolean, out_of_stock boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ord public.orders%ROWTYPE;
  picked public.product_stock_items%ROWTYPE;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF ord.status <> 'pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;

  -- Only auto-fulfill product orders (skip plans, if any)
  IF ord.item_kind = 'product' THEN
    SELECT * INTO picked
      FROM public.product_stock_items
     WHERE product_id = ord.item_id AND status = 'available'
     ORDER BY created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT 1;

    IF NOT FOUND THEN
      -- No stock: leave order pending, return signal
      RETURN QUERY SELECT _order_id, false, true;
      RETURN;
    END IF;

    UPDATE public.product_stock_items
       SET status = 'sold', assigned_order_id = _order_id, sold_at = now()
     WHERE id = picked.id;

    UPDATE public.orders
       SET status = 'approved',
           admin_note = _note,
           reviewed_by = uid,
           reviewed_at = now(),
           delivered_content = picked.content,
           stock_item_id = picked.id
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
END;
$$;
REVOKE ALL ON FUNCTION public.approve_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_order(uuid, text) TO authenticated;
