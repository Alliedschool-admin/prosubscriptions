ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify_text(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_t, '')), '[^a-z0-9]+', '-', 'g'))
$$;

UPDATE public.posts
SET slug = CASE
  WHEN public.slugify_text(title) = '' THEN 'post-' || left(id::text, 8)
  ELSE left(public.slugify_text(title), 60) || '-' || left(id::text, 6)
END
WHERE slug IS NULL;

CREATE OR REPLACE FUNCTION public.posts_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := CASE
      WHEN public.slugify_text(NEW.title) = '' THEN 'post-' || left(NEW.id::text, 8)
      ELSE left(public.slugify_text(NEW.title), 60) || '-' || left(NEW.id::text, 6)
    END;
  ELSE
    NEW.slug := left(public.slugify_text(NEW.slug), 70);
    IF NEW.slug = '' THEN
      NEW.slug := 'post-' || left(NEW.id::text, 8);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_set_slug_trg ON public.posts;
CREATE TRIGGER posts_set_slug_trg
BEFORE INSERT OR UPDATE OF slug, title ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_set_slug();

ALTER TABLE public.posts ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON public.posts (slug);