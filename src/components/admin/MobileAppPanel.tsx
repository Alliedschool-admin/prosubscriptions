import { Download, Smartphone, Hammer, Rocket, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Download,
    title: "Download the package",
    body: "Grab the native v2 package below — it is a full Kotlin + Jetpack Compose app, no WebView required.",
  },
  {
    icon: Hammer,
    title: "Build or install",
    body: "Install the APK directly on your phone, or open the project in Android Studio to customize and sign a release build.",
  },
  {
    icon: Rocket,
    title: "Share or publish",
    body: "Share the APK with customers, or sign the AAB and upload it to Google Play.",
  },
];

export function MobileAppPanel() {
  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Smartphone className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Mobile app (Android)</h2>
          <p className="text-sm text-muted">
            Fully native v2 app: built in Kotlin with Jetpack Compose, loads products offline, syncs when online,
            and supports email sign-in, Google OAuth, cart, checkout, proof upload, coupons, My Vault, requests, and admin.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Native v2.3
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight">Digital Chacho · Native v2.3</h3>
        <p className="mt-1 text-sm text-muted">
          Kotlin + Jetpack Compose · package id <span className="font-mono">store.digitalchacho.nativeapp</span>
        </p>
        <p className="mt-1 text-xs text-primary">
          v2.3 adds dark / light mode with a one-tap switch, a futuristic floating glass nav dock, and a new brand bar.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/downloads/digital-chacho-native-v2.3.zip?v=2.3"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            <Download className="size-4" /> Download project package
          </a>
          <a
            href="/__l5e/assets-v1/92bb18e1-7641-48a0-8d6e-e011e3128c6c/digital-chacho-native-v2.3.apk"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-foreground transition hover:bg-foreground/5"
          >
            <Sparkles className="size-4" /> Download APK (v2.3)
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          The APK is a debug build — perfect for installing on your own phone or sharing with
          customers. For Google Play you must sign a release build (steps included in the package
          README).
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Legacy v1.3
        </p>
        <h3 className="mt-2 text-lg font-extrabold tracking-tight">Digital Chacho · WebView v1.3</h3>
        <p className="mt-1 text-sm text-muted">
          Offline-first WebView shell: the store loads from the device even with no internet, then syncs silently.
          Google sign-in works, pull-to-refresh syncs on demand, and WhatsApp/payment links open in their own apps.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/downloads/digital-chacho-android.zip?v=1.3"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-foreground transition hover:bg-foreground/5"
          >
            <Download className="size-4" /> Download v1.3 project
          </a>
          <a
            href="/downloads/digital-chacho-app.apk?v=1.3"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-foreground transition hover:bg-foreground/5"
          >
            <Smartphone className="size-4" /> Download v1.3 APK
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-foreground/5 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                Step {i + 1}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
