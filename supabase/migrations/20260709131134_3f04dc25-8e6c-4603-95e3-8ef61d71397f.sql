ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_usd numeric(12,2),
  ADD COLUMN IF NOT EXISTS cost_pkr numeric(12,2);