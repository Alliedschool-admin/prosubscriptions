
-- ============ COUPONS ============
CREATE TYPE public.coupon_kind AS ENUM ('percent','fixed');

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind public.coupon_kind NOT NULL DEFAULT 'percent',
  value numeric NOT NULL CHECK (value > 0),
  currency text,                          -- NULL = any; otherwise 'USD' or 'PKR' (for fixed) or any (for percent)
  min_amount numeric NOT NULL DEFAULT 0,
  max_uses integer,                       -- NULL = unlimited
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Signed-in users can read only currently valid coupons (needed so apply RPC can be a plain query fallback and admin can list). Admins full access.
CREATE POLICY "Authenticated read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (active AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ORDERS: coupon fields ============
ALTER TABLE public.orders
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- ============ apply_coupon RPC ============
-- Validates a code against subtotal/currency and returns the discount amount + kind.
CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _subtotal numeric, _currency text)
RETURNS TABLE(code text, kind public.coupon_kind, value numeric, discount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.coupons%ROWTYPE;
  d numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.coupons WHERE lower(code) = lower(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid code'; END IF;
  IF NOT c.active THEN RAISE EXCEPTION 'Code inactive'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN RAISE EXCEPTION 'Code expired'; END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN RAISE EXCEPTION 'Code fully redeemed'; END IF;
  IF c.currency IS NOT NULL AND c.currency <> _currency THEN RAISE EXCEPTION 'Code not valid for this currency'; END IF;
  IF _subtotal < COALESCE(c.min_amount,0) THEN RAISE EXCEPTION 'Minimum spend not met'; END IF;

  IF c.kind = 'percent' THEN
    d := round((_subtotal * c.value / 100)::numeric, 2);
  ELSE
    d := c.value;
  END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;

  RETURN QUERY SELECT c.code, c.kind, c.value, d;
END; $$;

-- Increment usage (best-effort, called after order insert).
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.coupons
     SET uses_count = uses_count + 1
   WHERE lower(code) = lower(trim(_code));
END; $$;

-- ============ WISHLISTS ============
CREATE TABLE public.wishlists (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist"
  ON public.wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
