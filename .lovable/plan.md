## Vault.01 — Digital tools & Pro subscription marketplace

Mobile-first web app built on the selected "Hardware vault" direction. Fully client-side with mock data (no backend). Preview will be switched to mobile viewport.

### Design tokens (locked from chosen direction)
- Fonts: Inter (display, 400/700/800) + JetBrains Mono (mono, 400/500), loaded via `<link>` in `__root.tsx`.
- Colors in `src/styles.css` `@theme`: background `hsl(0 0% 98%)`, foreground `hsl(0 0% 7%)`, primary `hsl(15 100% 50%)` (vault orange), muted `hsl(0 0% 45%)`, border `hsl(0 0% 0% / 0.1)`.
- Motion: `slideUp`, `slideInRight` keyframes; `ease-out-expo` easing.
- Radii: `rounded-xl` / `rounded-2xl`. Sharp mono pill price tags.

### Routes (TanStack Router, files in `src/routes/`)
```
__root.tsx           shell: fonts, meta, nav + <Outlet/>
index.tsx            Discovery: hero, Single/Sub toggle, search, category chips, product grid
products.$id.tsx     Product detail w/ screenshots, features, sticky Buy Now
pricing.tsx          Free / Monthly Pro / Annual Pro (Best Value) tiers
dashboard.tsx        Profile, My Library downloads, Subscription status widget
```
Each route defines its own `head()` metadata (title/description/og).

### Shared components (`src/components/`)
- `TopNav.tsx` — sticky VAULT.01 nav w/ status dot + links (Discover, Pricing, Dashboard).
- `ProductCard.tsx` — square tile with VLT-xxx id, name, tagline, mono price chip.
- `CategoryChips.tsx`, `PurchaseToggle.tsx` (Single Tools ↔ Pro Sub).
- `CheckoutSheet.tsx` — slide-over modal: line item, promo input (`APPLY`), live totals, `CONFIRM ORDER`, success state with checkmark + order id.
- `StickyBuyBar.tsx` — bottom bar on product detail launching CheckoutSheet.
- `SubscriptionWidget.tsx` — plan, renewal date, Manage Subscription (simulated).

### Mock data (`src/lib/mock-data.ts`)
- 4 products: `KINETIC PRESETS ($49, Presets)`, `SWISS GRID SYSTEM ($29, UI Kits)`, `NEURAL PROMPTS PACK ($19, AI Tools)`, `EDGE STACK TEMPLATE ($59, Dev Templates)`. Each has id, code (VLT-042 etc), tagline, description, features[], screenshots[] (generated square images).
- 2 subscription plans surfaced on pricing: Monthly Pro ($19/mo) and Annual Pro ($179/yr, Best Value badge, ~22% off). Free tier shown alongside.
- 3 promo codes: `VAULT10` (10% off), `LAUNCH25` (25%), `PRO50` ($50 flat).
- Mock user: "Marcus Vane", Pro Active, renews 2026-08-08, library with 2 owned single products.

### State
- Zustand-light via React context: `CartContext` (current checkout item + open/close sheet), `PromoContext` inside sheet. Toggle + filters are local `useState` on discovery.

### Images
- Generate 4 product hero images (square, hardware/chrome/typographic aesthetic) into `src/assets/products/` and import into `mock-data.ts`.

### Interactions
- Toggle Single/Sub switches grid between products and plan cards.
- Search filters by name; chip filters by category.
- Product detail Buy Now opens `CheckoutSheet` with that product; pricing tier CTAs open sheet with subscription line item.
- Promo apply updates discount + total live; invalid code shows inline error.
- Confirm order → success screen with fake order ID and "Back to Vault".
- Dashboard Download buttons trigger a toast ("Download started").

### SEO/meta
Distinct `head()` per route. No og:image on root; leaf routes get generated product image for og where applicable.

### Out of scope
No auth, no database, no real payments. Dashboard user is hardcoded mock. Cloud is not enabled.
