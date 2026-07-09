# Vault.01 — Improvement Plan

A prioritized set of upgrades across performance, UX, i18n, admin, and quality. Grouped so you can approve everything or cherry-pick.

---

## 1. Translation system (biggest win)

Current: every visible text node is sent to the AI gateway on language switch — slow, expensive, and flickers.

Improvements:
- Ship a **static dictionary** for all built-in UI strings (nav, buttons, tabs, product card labels, checkout, admin). Instant switch, zero API calls for the app shell.
- Keep the AI DOM-translator **only as a fallback** for dynamic/user content (product names, descriptions, posts).
- Precompute translations for mock product data (name, tagline, description) at build time and store alongside `mock-data.ts`.
- Add a small **language switch spinner** + skeleton so users see progress instead of English flashing.
- Persist cache with a version key so dictionary updates invalidate cleanly.

## 2. Theming & design polish

- Fix any remaining light-mode contrast issues (ember accent on light bg, borders, muted text).
- Add smooth theme-transition (200ms) on `color`, `background`, `border` — avoid jarring flash.
- Respect `prefers-reduced-motion` for the subtle/premium motion set.
- Ensure focus rings visible in both themes (currently faint in dark).

## 3. Admin panel (mobile responsiveness)

- Convert the tabs bar into a **horizontal scroll-snap** row with fade edges on <640px, and a **grouped dropdown** ("More ▾") on very small screens.
- Sticky sub-header per tab with search + primary action.
- Tables → **card list** on mobile (already partial); finish for Orders, Requests, Users.
- Add empty states and skeleton loaders per tab.

## 4. Performance

- Route-level **code splitting** for admin (heaviest bundle).
- Lazy-load product images with `loading="lazy"` + blurred placeholder.
- Prefetch on `<Link>` hover for product detail.
- Debounce search input (150ms).
- Move translation cache to IndexedDB when it exceeds ~200KB.

## 5. SEO & metadata

- Unique `head()` per route with real titles/descriptions (some still generic).
- Add JSON-LD `Product` schema on product detail pages.
- Generate an `og:image` per product (already have hero art — wire it in).
- Add `sitemap.xml` + `robots.txt` route.

## 6. Auth & account UX

- Post-login redirect back to the originally requested page.
- "Forgot password" flow polish (already exists — add success toast + resend cooldown).
- Show provider (Google / email) on the account panel.
- Session-expired toast + auto-redirect to `/auth`.

## 7. Checkout & orders

- Persist cart in `localStorage` so refresh doesn't lose it.
- Order confirmation email (via Lovable Cloud — optional).
- "Recent orders" widget on dashboard with re-download.

## 8. Community / posts

- Optimistic UI on like / comment.
- Image upload with client-side compression before upload.
- Report / hide post action for admins.

## 9. Accessibility

- Audit color contrast (WCAG AA) in both themes.
- Add `aria-label` on icon-only buttons (lang switcher, theme toggle, nav).
- Trap focus in `CheckoutSheet` and close on Esc.
- Announce language change to screen readers.

## 10. Developer quality

- Add `eslint-plugin-jsx-a11y` rules.
- Wire a `bunx vitest` smoke test for translate function + cart reducer.
- Add error boundary per route with retry.

---

## Suggested first slice (if you want a smaller scope)

**Phase A (high impact, ~1 pass):**
- #1 Static dictionary + fallback AI translator
- #3 Admin mobile tabs (scroll-snap + More menu)
- #2 Theme transition + focus rings
- #5 Per-route metadata + product JSON-LD

**Phase B (next):**
- #4 Perf (code split admin, lazy images)
- #6 Auth redirect + session toast
- #7 Cart persistence
- #9 A11y pass

**Phase C (polish):**
- #8 Community optimistic UI
- #10 Tests + a11y lint

---

Approve the whole plan, pick a phase, or tell me which numbered items to build.
