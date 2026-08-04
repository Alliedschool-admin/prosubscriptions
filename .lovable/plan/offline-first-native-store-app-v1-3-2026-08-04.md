# Offline-first native store app (v1.3)

Goal: after install, the app opens and shows the **full store** — products, prices, images, pages — with **no internet at all**. Anything that truly needs the server (sign in, admin, checkout, claiming a product) asks for a connection instead of failing silently.

## How it will work

```text
launch
  ├─ instant local boot screen (already shipped)
  ├─ load bundled store snapshot from inside the app  ← works with zero internet
  └─ if online → quietly load the live store and save a fresh snapshot for next time
```

1. **Bundled store snapshot.** The APK ships a copy of the storefront (HTML/CSS/JS shell + a products.json + product thumbnails) inside `assets/`. Served locally through Android's asset loader on a `https://appassets.androidplatform.net` origin, so the same site code runs unchanged and browser storage/session stays valid.
2. **Cache-then-network.** Offline or slow: the snapshot renders immediately. Online: the live site loads in the background and replaces the view once ready; the downloaded copy is written to app storage so the next cold start (even offline) shows the newest products, not the install-day ones.
3. **Silent sync.** On resume, on pull-to-refresh, and when connectivity returns, the app refreshes the snapshot in the background — no spinner, no interruption.
4. **Online-only actions.** Sign in / Google sign-in, admin panel, checkout, free-claim, requests and reviews are gated: with no connection the app shows a clean "You're offline — connect to sign in" sheet with a retry, instead of a dead form. Browsing, product details, My Vault (already-purchased list from the last sync) stay readable offline.
5. **Offline badge.** A small "Offline — showing your saved store" pill at the top while there is no connection, which disappears the moment sync succeeds.

## Technical notes

- `MainActivity.java`: add `WebViewAssetLoader` with an assets path handler plus an app-storage handler, so the snapshot can be updated after install. Boot order becomes boot.html → snapshot → live site.
- Snapshot writer: on a successful live load, fetch `/` plus the product API payload and store under `filesDir/snapshot/`; serve that folder ahead of the bundled assets when present.
- Connectivity: `ConnectivityManager.NetworkCallback` (registered in `onStart`) replaces polling, driving the offline pill and the online-only gate.
- JS bridge gains `DCApp.isOnline()` so the web app can disable sign-in/checkout buttons offline; used by a small guard in the web app's auth/checkout entry points (no change to auth or payment logic itself).
- `AndroidManifest.xml`: no new permissions needed.
- Web side: a tiny `useNativeOnline()` helper reads the bridge (falls back to `navigator.onLine` in browsers) and renders the offline sheet. Nothing else in the store logic changes.
- Version bumps to `1.3` / versionCode 4; rebuild APK + project zip and update the Admin → Mobile App download panel.

## Limits worth knowing

- The bundled snapshot is a point-in-time copy, so a fully offline first launch shows install-day products until the first online sync.
- Product **delivery** (keys, links, downloads) always needs internet — it comes from the server on demand.
