import { Download, Smartphone, Hammer, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: Download,
    title: "Download the package",
    body: "Grab the zip below — it contains the complete Android Studio project for the Digital Chacho app.",
  },
  {
    icon: Hammer,
    title: "Build the APK",
    body: "Open the folder in Android Studio, then Build → Build APK(s). The APK appears in app/build/outputs/apk/.",
  },
  {
    icon: Rocket,
    title: "Install or publish",
    body: "Share the APK directly with customers, or sign it and upload the .aab to Google Play.",
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
            A native Android shell around the live store — app icon, splash colors, pull-to-refresh,
            back-button navigation, and WhatsApp/payment links opened in their own apps.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Ready to build
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight">Digital Chacho · v1.0</h3>
        <p className="mt-1 text-sm text-muted">
          Android project package · package id <span className="font-mono">store.digitalchacho.app</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/downloads/digital-chacho-android.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            <Download className="size-4" /> Download app package
          </a>
          <a
            href="/downloads/digital-chacho-app.apk"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-foreground transition hover:bg-foreground/5"
          >
            <Smartphone className="size-4" /> Download APK
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          The APK is a debug build — perfect for installing on your own phone or sharing with
          customers. For Google Play you must sign a release build (steps included in the package
          README).
        </p>
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
