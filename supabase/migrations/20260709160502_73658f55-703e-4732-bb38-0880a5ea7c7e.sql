
CREATE TABLE public.site_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_key text,
  path text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a visit" ON public.site_visits FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX site_visits_created_at_idx ON public.site_visits (created_at DESC);
CREATE INDEX site_visits_visitor_key_idx ON public.site_visits (visitor_key);

CREATE OR REPLACE FUNCTION public.record_site_visit(_visitor_key text, _path text, _user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.site_visits (visitor_key, path, user_agent)
  VALUES (_visitor_key, _path, _user_agent);
END; $$;

CREATE OR REPLACE FUNCTION public.visitor_stats()
RETURNS TABLE(total_visits bigint, unique_visitors bigint, visits_today bigint, visits_7d bigint, visits_30d bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    count(*)::bigint,
    count(DISTINCT visitor_key)::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '1 day')::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '7 days')::bigint,
    count(*) FILTER (WHERE created_at >= now() - interval '30 days')::bigint
  FROM public.site_visits;
END; $$;

GRANT EXECUTE ON FUNCTION public.record_site_visit(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_stats() TO authenticated;
