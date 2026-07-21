
-- Reviews
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews own insert" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own update" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own delete" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Loyalty points
CREATE TABLE public.loyalty_points (
  user_id uuid PRIMARY KEY,
  points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty read own" ON public.loyalty_points FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Award points on approved order
CREATE OR REPLACE FUNCTION public.award_loyalty_on_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pts int;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') AND NEW.buyer_id IS NOT NULL THEN
    pts := GREATEST(floor(COALESCE(NEW.amount,0))::int, 0);
    IF pts > 0 THEN
      INSERT INTO public.loyalty_points (user_id, points, updated_at)
      VALUES (NEW.buyer_id, pts, now())
      ON CONFLICT (user_id) DO UPDATE SET points = public.loyalty_points.points + EXCLUDED.points, updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_award_loyalty AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_approve();

-- Broadcasts
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.broadcasts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broadcasts public read active" ON public.broadcasts FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "broadcasts admin write" ON public.broadcasts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "broadcasts admin update" ON public.broadcasts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "broadcasts admin delete" ON public.broadcasts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Public purchase ticker: masked recent approvals
CREATE OR REPLACE FUNCTION public.recent_purchases_public()
RETURNS TABLE(id uuid, first_name text, item_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id,
    COALESCE(NULLIF(split_part(o.sender_name,' ',1),''),'Someone') AS first_name,
    o.item_name, o.created_at
  FROM public.orders o
  WHERE o.status = 'approved'
  ORDER BY o.created_at DESC
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.recent_purchases_public() TO anon, authenticated;

-- Sales analytics
CREATE OR REPLACE FUNCTION public.admin_sales_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'total_revenue_usd', COALESCE((SELECT sum(amount) FROM orders WHERE status='approved' AND currency='USD'),0),
    'total_revenue_pkr', COALESCE((SELECT sum(amount) FROM orders WHERE status='approved' AND currency='PKR'),0),
    'total_orders', (SELECT count(*) FROM orders WHERE status='approved'),
    'pending_orders', (SELECT count(*) FROM orders WHERE status='pending'),
    'rejected_orders', (SELECT count(*) FROM orders WHERE status='rejected'),
    'orders_today', (SELECT count(*) FROM orders WHERE status='approved' AND created_at >= now() - interval '1 day'),
    'orders_7d', (SELECT count(*) FROM orders WHERE status='approved' AND created_at >= now() - interval '7 days'),
    'orders_30d', (SELECT count(*) FROM orders WHERE status='approved' AND created_at >= now() - interval '30 days'),
    'top_products', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT item_name, count(*)::int AS sales, sum(amount)::numeric AS revenue, currency
          FROM orders WHERE status='approved'
          GROUP BY item_name, currency
          ORDER BY sales DESC LIMIT 10
      ) t
    ),'[]'::jsonb),
    'daily_30d', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY d) FROM (
        SELECT date_trunc('day', created_at)::date AS d,
               count(*)::int AS orders,
               sum(amount) FILTER (WHERE currency='USD')::numeric AS usd,
               sum(amount) FILTER (WHERE currency='PKR')::numeric AS pkr
          FROM orders WHERE status='approved' AND created_at >= now() - interval '30 days'
          GROUP BY d ORDER BY d
      ) t
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_sales_stats() TO authenticated;

-- Enable realtime for purchase ticker & broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
