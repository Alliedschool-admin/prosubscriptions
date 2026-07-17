CREATE OR REPLACE FUNCTION public.apply_coupon(_code text, _subtotal numeric, _currency text)
 RETURNS TABLE(code text, kind coupon_kind, value numeric, discount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
  d numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.coupons cp WHERE lower(cp.code) = lower(trim(_code)) LIMIT 1;
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

  code := c.code;
  kind := c.kind;
  value := c.value;
  discount := d;
  RETURN NEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.coupons cp
     SET uses_count = cp.uses_count + 1
   WHERE lower(cp.code) = lower(trim(_code));
END; $function$;