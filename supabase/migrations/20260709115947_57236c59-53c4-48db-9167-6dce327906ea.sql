
-- payment methods
CREATE TYPE public.payment_method_kind AS ENUM ('jazzcash','easypaisa','nayapay','sadapay','bank','binance_pay','crypto','other');

CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.payment_method_kind NOT NULL,
  label text NOT NULL,
  account_name text,
  account_number text NOT NULL,
  instructions text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active payment methods viewable by all"
  ON public.payment_methods FOR SELECT
  TO anon, authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert payment methods"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update payment methods"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete payment methods"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payment_methods_set_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- orders
CREATE TYPE public.order_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_kind text NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  payment_method_label text,
  sender_name text NOT NULL,
  sender_contact text NOT NULL,
  transaction_ref text,
  proof_path text,
  status public.order_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own orders, admins view all"
  ON public.orders FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status, created_at DESC);
