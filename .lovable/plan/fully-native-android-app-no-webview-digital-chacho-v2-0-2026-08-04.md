# Fully native Android app (no WebView) — Digital Chacho v2.0

Yes. The app can be rebuilt as a real native Android app in Kotlin + Jetpack Compose that talks directly to the Lovable Cloud backend (REST + auth + storage + realtime) over HTTPS. No WebView anywhere, no page loads — every screen is native UI, and it works offline from a local database.

Important trade-off to accept up front: once the app is native, changes you make to the website no longer appear in the app automatically. Product data, prices, posts, stock and broadcasts still come live from the same backend (so day-to-day store management in the web admin keeps working), but new *screens* or layout changes on the web must be mirrored in Kotlin as a separate task and shipped as a new APK version.

## What the native app will contain

Customer side
- Store home: hero, product grid, posts feed (free methods & updates), tech news, live purchase ticker, community links.
- Product detail: gallery, price in USD/PKR, stock state, reviews & ratings, related products, buy now, request-this when out of stock, wishlist.
- Cart + checkout: quantity, coupon code, payment method selection, payment proof upload from camera/gallery, WhatsApp "payment done" ping to 923108411396.
- Auth: email/password, Google sign-in via native Credential Manager (no browser popup, no user-agent hacks), password reset.
- My Vault: purchases, delivered content, copy/reveal, remove item.
- Requests: submit a product request, see admin replies.
- Wishlist, loyalty points card, profile, broadcast announcements as in-app banner + notification.

Admin side (native, gated by the existing role check)
- Orders queue: approve / reject with note, stock delivery.
- Products: create, edit, prices, free flag, images, stock items.
- Posts, coupons, payment methods, product requests + replies.
- Users, admins & invites, sales analytics, visitor stats.
- Appearance (skin + background preset) applied to the native theme too.

## Offline-first behaviour

- A local Room database mirrors products, stock counts, posts, reviews, the user's orders/vault, requests and wishlist.
- First launch ships with a seeded snapshot inside the APK, so the store is fully browsable with zero internet immediately after install.
- On every launch and on reconnect, a background sync refreshes from the backend and writes into Room; the UI always reads Room, so it never blocks on the network.
- Actions that must hit the server (sign-in, checkout, admin approvals, proof upload) queue or show a clear "needs connection" state instead of failing.

## Design

Native Compose theme reproducing the current look: obsidian background, aurora/molten gradients, glass surfaces, animated gradient background presets, the Digital Chacho crown emblem, the same typography scale and motion (reveal on scroll, shimmer, count-up stats).

## Technical notes

- Project: `android-native/` (new), Kotlin, Compose Material 3, min SDK 24, target 35, Navigation-Compose, Hilt, Room, Retrofit/Ktor + kotlinx-serialization, Coil for images, DataStore for session/prefs, WorkManager for sync.
- Backend access: PostgREST endpoints and GoTrue auth against the existing project using the publishable/anon key only; all existing RLS policies and security-definer RPCs (`apply_coupon`, `claim_free_product`, `approve_order`, `admin_sales_stats`, `list_users`, `visitor_stats`, `record_site_visit`, `redeem_coupon`, `has_role`, …) are called as RPCs. No new service-role key on device, no schema changes needed.
- Google sign-in uses Credential Manager + `signInWithIdToken`, which removes the WebView `disallowed_useragent` class of problems entirely.
- Storage: signed-URL reads for `media`, direct upload for `payment-proofs`.
- Realtime websocket subscription for broadcasts, order status changes and the purchase ticker; falls back to polling.
- I compile it here with the JDK 17 + Android SDK already installed in this environment and publish `digital-chacho-native.apk` plus the full source zip to `public/downloads/`, wired into the existing Admin → Mobile App tab (it will offer both the native build and the current v1.3 WebView build until you're happy).
- The existing `android-app/` WebView project and all web code stay untouched.

## Delivery order

1. Project skeleton, theme, navigation, backend client + auth.
2. Room schema, sync engine, bundled snapshot, offline gates.
3. Customer screens: home, product detail, cart/checkout, vault, requests, wishlist.
4. Admin screens.
5. Polish, build APK, publish to Admin → Mobile App.

This is a large build — expect it to run across several steps rather than one pass.
