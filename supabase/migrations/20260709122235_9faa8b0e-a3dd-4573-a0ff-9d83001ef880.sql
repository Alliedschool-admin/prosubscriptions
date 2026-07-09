
-- Add dual-currency prices to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_usd numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_pkr numeric;
UPDATE public.products SET price_usd = price WHERE price_usd IS NULL;

-- Ensure at least one currency price is set on save
CREATE OR REPLACE FUNCTION public.products_require_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.price_usd IS NULL OR NEW.price_usd <= 0)
     AND (NEW.price_pkr IS NULL OR NEW.price_pkr <= 0) THEN
    RAISE EXCEPTION 'A product must have a USD price, a PKR price, or both';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_require_price_trg ON public.products;
CREATE TRIGGER products_require_price_trg
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_require_price();

-- Tag payment methods with the currency they accept
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PKR'
  CHECK (currency IN ('USD','PKR'));
