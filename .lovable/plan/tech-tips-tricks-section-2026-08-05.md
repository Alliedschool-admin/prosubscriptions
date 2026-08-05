# Tech Tips & Tricks section

Give customers a dedicated page where everything you post (tips, free methods, updates, announcements) lives, with a new "Tip / Trick" category so tips are their own thing instead of being mixed into updates.

## What customers get

- A new page at `/tips` titled "Tech tips & tricks".
- Filter chips at the top: All / Tips & tricks / Free methods / Updates / Announcements.
- Same card style as the current home feed (image, category badge, date, pinned marker, body, optional link), just full-page with a search box for long lists.
- A "Tips & tricks" link in the top navigation and in the mobile dock, plus an entry in the command palette (Cmd+K).
- The home page feed stays as-is (short preview) and gains a "See all tips & updates" link pointing to `/tips`.

## What you get as admin

- The post editor gets one more category option: "Tip / trick". Everything else (image, link, pinned, published) works exactly as today.
- Nothing about existing posts changes; they keep their current categories.

## Technical notes

- Migration: add `'tip'` value to the existing `post_category` enum. No table or policy changes needed — the `posts` table already has public read of published rows.
- New route `src/routes/tips.tsx` (public, SSR on) with its own `head()` metadata (title, description, og/twitter tags). It reuses `usePublishedPosts`, `CATEGORY_META`, and the card markup extracted from `src/components/PostsFeed.tsx` into a shared `PostCard` so both surfaces stay identical.
- `CATEGORY_META` gains a `tip` entry (Lightbulb icon, cyan/violet tone consistent with the active skin tokens).
- Category filter + search live in URL search params via `validateSearch` so a filtered view is shareable.
- Add the nav item in `src/components/TopNav.tsx` (desktop + mobile dock) and register the page in `src/components/CommandPalette.tsx`.
- Admin: add the `tip` option to the category `<select>` and label map in `PostsAdminPanel` inside `src/routes/_authenticated/admin.tsx`.
- No changes to orders, checkout, auth, or the native app.
