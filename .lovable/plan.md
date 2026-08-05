# Make tips & posts indexable by Google

Short answer to your question: **not yet.** Right now /tips loads its posts in the browser after the page opens, the sitemap only lists the homepage, every post lives on one shared URL, and the page's canonical tag points at the old `prosubscriptions.lovable.app` domain instead of `www.digitalchacho.store`. Google can sometimes read JS-rendered content, but with one URL and no sitemap entries your tips will barely rank. This plan fixes all four issues.

## What changes for visitors and for Google

- **Each post gets its own page**, e.g. `www.digitalchacho.store/tips/how-to-get-netflix-cheap`, with its own title, description, social preview image and Article structured data. That is what actually ranks in Google.
- **/tips becomes a hub page** listing every post with links to those pages. Filters and search keep working.
- **Content arrives in the HTML** (server-rendered), so Google sees the full text on first fetch instead of an empty shell.
- **The sitemap becomes automatic**: homepage, /tips, every published post, and every product. New posts appear in it the moment you publish them, so Search Console picks them up on its next crawl.
- **Canonical and social tags switch to `https://www.digitalchacho.store`** across the site, so Google credits your custom domain and not the Lovable URL.
- Unpublished posts stay out of the sitemap and are not reachable.

## What changes in the admin panel

- The post editor gains an optional **URL slug** field, prefilled automatically from the title (editable, uniqueness enforced). Existing posts get slugs generated once from their titles.
- Nothing else about posting changes.

## Technical notes

- Migration: add `slug text unique` to `public.posts`, backfill from `title` (lowercase, non-alphanumerics to `-`, dedupe with a short id suffix), keep it nullable-safe with a trigger/default for new rows; no policy change needed (published rows are already publicly readable). Grants unchanged.
- New route `src/routes/tips.$slug.tsx`: loader fetches the single published post server-side by slug (anon publishable client inside the loader), `notFound()` when missing; `head()` emits title, description (first ~155 chars of body), `og:*`, `twitter:*`, `og:image` when the post has an image, self-referencing canonical, and Article JSON-LD.
- `src/routes/tips.tsx`: add a loader that server-fetches published posts and seeds the query cache so the list is in the initial HTML; keep client filter/search; each `PostCard` title links to `/tips/$slug`; canonical/og:url move to the custom domain; add BreadcrumbList/CollectionPage JSON-LD.
- `src/components/PostsFeed.tsx`: `PostCard` gains an optional link target so the homepage feed also links to post pages.
- Replace static `public/sitemap.xml` with a generated `src/routes/sitemap[.]xml.ts` server route (static routes + published posts + products, `BASE_URL = https://www.digitalchacho.store`), and delete the static file so it cannot shadow the route. `lastmod` uses each row's `updated_at` only — no build-time dates.
- `public/robots.txt`: keep existing rules, keep the sitemap directive pointing at the custom domain.
- Audit `src/routes/index.tsx`, `products.$id.tsx`, `requests.tsx`, `wishlist.tsx`, `__root.tsx` for stale `prosubscriptions.lovable.app` references and self-referencing canonicals; add missing ones. Admin/auth/dashboard routes get `robots: noindex`.
- No changes to orders, checkout, auth, coupons, or the native app.

## After it ships

You publish, then in Search Console submit `https://www.digitalchacho.store/sitemap.xml` once. Indexing itself is Google's call and usually takes days to a couple of weeks per new page.
