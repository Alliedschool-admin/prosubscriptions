-- ============================================================================
-- Security hardening: server-side order amount validation + atomic checkout
--
-- Problems fixed:
--  1. `orders.amount` / `discount_amount` were fully client-controlled: any
--     authenticated user could insert an order with amount = 0 (or an inflated
--     discount) via a direct PostgREST insert.
--  2. Coupon redemption was a separate best-effort RPC called *after* the
--     order insert — not atomic, so a failed/skipped call let the same coupon
--     be reused indefinitely.
--
-- Fixes:
--  A. BEFORE INSERT trigger on public.orders that recomputes the expected
--     subtotal / discount / total server-side and rejects (or normalizes)
--     mismatching rows. Defense in depth: applies to ALL insert paths.
--  B. place_order() SECURITY DEFINER RPC that validates the product price,
--     payment method, and coupon (with a row lock), inserts the order and
--     increments coupon usage in ONE transaction.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A) Defense-in-depth: validate order amounts on every INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_validate_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prod public.products%ROWTYPE;
  unit numeric;
  sub numeric;
  expected_discount numeric := 0;
  expected_total numeric;
  qty integer;
BEGIN
  -- Only 'product' orders are priced against the catalog today.
  IF NEW.item_kind <> 'product' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO prod FROM public.products WHERE id = NEW.item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown product for order';
  END IF;

  -- Free products must be zero-amount (claim_free_product path).
  IF prod.is_free THEN
    IF COALESCE(NEW.amount, 0) <> 0 OR COALESCE(NEW.discount_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'Free products must have a zero amount';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.currency NOT IN ('USD', 'PKR') THEN
    RAISE EXCEPTION 'Unsupported currency';
  END IF;

  unit := CASE NEW.currency WHEN 'USD' THEN prod.price_usd ELSE prod.price_pkr END;
  IF unit IS NULL OR unit <= 0 THEN
    RAISE EXCEPTION 'Product has no active % price', NEW.currency;
  END IF;

  qty := COALESCE(NEW.quantity, 1);
  sub := round((unit * qty)::numeric, 2);

  -- Recompute the coupon discount server-side. apply_coupon() re-validates
  -- active/expiry/uses/currency/min-spend and raises on any violation.
  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    SELECT ac.discount INTO expected_discount
      FROM public.apply_coupon(NEW.coupon_code, sub, NEW.currency) ac;
  END IF;

  IF abs(COALESCE(NEW.discount_amount, 0) - expected_discount) > 0.01 THEN
    RAISE EXCEPTION 'Order discount does not match coupon';
  END IF;

  expected_total := greatest(sub - expected_discount, 0);
  IF abs(COALESCE(NEW.amount, 0) - expected_total) > 0.01 THEN
    RAISE EXCEPTION 'Order amount does not match product price';
  END IF;

  -- Normalize away client float noise (e.g. 59.97000000000001).
  NEW.amount := expected_total;
  NEW.discount_amount := expected_discount;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.orders_validate_amount() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_validate_amount_trg ON public.orders;
CREATE TRIGGER orders_validate_amount_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_validate_amount();

-- ---------------------------------------------------------------------------
-- B) Atomic checkout: place_order()
--    Validates everything server-side, inserts the order and redeems the
--    coupon in a single transaction (coupon row locked FOR UPDATE so
--    max_uses cannot be raced past by concurrent checkouts).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
  _item_id text,
  _currency text,
  _quantity integer,
  _payment_method_id uuid,
  _sender_name text,
  _sender_contact text,
  _transaction_ref text DEFAULT NULL,
  _proof_path text DEFAULT NULL,
  _coupon_code text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, amount numeric, discount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prod public.products%ROWTYPE;
  pm public.payment_methods%ROWTYPE;
  c public.coupons%ROWTYPE;
  unit numeric;
  sub numeric;
  disc numeric := 0;
  total numeric;
  qty integer;
  new_id uuid;
  normalized_code text := NULLIF(btrim(COALESCE(_coupon_code, '')), '');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;

  IF _currency NOT IN ('USD', 'PKR') THEN
    RAISE EXCEPTION 'Unsupported currency';
  END IF;

  qty := COALESCE(_quantity, 1);
  IF qty < 1 OR qty > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100';
  END IF;

  IF btrim(COALESCE(_sender_name, '')) = '' OR btrim(COALESCE(_sender_contact, '')) = '' THEN
    RAISE EXCEPTION 'Sender name and contact are required';
  END IF;

  -- Product & server-side price
  SELECT * INTO prod FROM public.products WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF prod.is_free THEN RAISE EXCEPTION 'This product is free — use the free claim instead'; END IF;

  unit := CASE _currency WHEN 'USD' THEN prod.price_usd ELSE prod.price_pkr END;
  IF unit IS NULL OR unit <= 0 THEN
    RAISE EXCEPTION 'Product has no active % price', _currency;
  END IF;
  sub := round((unit * qty)::numeric, 2);

  -- Payment method must exist, be active, and match the order currency
  SELECT * INTO pm FROM public.payment_methods WHERE id = _payment_method_id;
  IF NOT FOUND OR NOT pm.active THEN
    RAISE EXCEPTION 'Payment method unavailable';
  END IF;
  IF COALESCE(pm.currency, 'PKR') <> _currency THEN
    RAISE EXCEPTION 'Payment method does not accept %', _currency;
  END IF;

  -- Coupon: validate under a row lock so max_uses cannot be raced.
  IF normalized_code IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons
     WHERE lower(code) = lower(normalized_code)
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid code'; END IF;
    IF NOT c.active THEN RAISE EXCEPTION 'Code inactive'; END IF;
    IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN RAISE EXCEPTION 'Code expired'; END IF;
    IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN RAISE EXCEPTION 'Code fully redeemed'; END IF;
    IF c.currency IS NOT NULL AND c.currency <> _currency THEN RAISE EXCEPTION 'Code not valid for this currency'; END IF;
    IF sub < COALESCE(c.min_amount, 0) THEN RAISE EXCEPTION 'Minimum spend not met'; END IF;

    IF c.kind = 'percent' THEN
      disc := round((sub * c.value / 100)::numeric, 2);
    ELSE
      disc := c.value;
    END IF;
    IF disc > sub THEN disc := sub; END IF;
  END IF;

  total := greatest(sub - disc, 0);

  -- Insert first (validation trigger sees the pre-increment uses_count),
  -- then redeem the coupon — all in this one transaction.
  INSERT INTO public.orders (
    buyer_id, item_kind, item_id, item_name, amount, currency, quantity,
    payment_method_id, payment_method_label,
    sender_name, sender_contact, transaction_ref, proof_path,
    coupon_code, discount_amount
  ) VALUES (
    uid, 'product', prod.id, prod.name, total, _currency, qty,
    pm.id,
    (CASE pm.kind
       WHEN 'jazzcash'    THEN 'JazzCash'
       WHEN 'easypaisa'   THEN 'Easypaisa'
       WHEN 'nayapay'     THEN 'NayaPay'
       WHEN 'sadapay'     THEN 'SadaPay'
       WHEN 'bank'        THEN 'Bank Transfer'
       WHEN 'binance_pay' THEN 'Binance Pay'
       WHEN 'crypto'      THEN 'Crypto Wallet'
       ELSE 'Other'
     END) || ' · ' || pm.label,
    btrim(_sender_name), btrim(_sender_contact),
    NULLIF(btrim(COALESCE(_transaction_ref, '')), ''), _proof_path,
    CASE WHEN normalized_code IS NOT NULL THEN c.code ELSE NULL END, disc
  ) RETURNING id INTO new_id;

  IF normalized_code IS NOT NULL THEN
    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = c.id;
  END IF;

  RETURN QUERY SELECT new_id, total, disc;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, integer, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, integer, uuid, text, text, text, text, text) TO authenticated;
