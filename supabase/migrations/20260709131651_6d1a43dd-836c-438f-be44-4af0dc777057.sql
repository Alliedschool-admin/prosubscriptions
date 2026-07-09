
DO $$ BEGIN
  CREATE TYPE public.product_request_status AS ENUM ('new','in_review','responded','fulfilled','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  details text,
  reference_link text,
  contact text,
  status public.product_request_status NOT NULL DEFAULT 'new',
  admin_response text,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_requests TO authenticated;
GRANT ALL ON public.product_requests TO service_role;

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests, admins view all"
  ON public.product_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own requests"
  ON public.product_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own requests"
  ON public.product_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update any, users update own product_name/details"
  ON public.product_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_requests_set_updated_at
  BEFORE UPDATE ON public.product_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX product_requests_user_id_idx ON public.product_requests(user_id);
CREATE INDEX product_requests_status_idx ON public.product_requests(status);
