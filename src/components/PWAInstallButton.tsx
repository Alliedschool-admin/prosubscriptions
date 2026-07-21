import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIOS(iOS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS Safari: no install prompt API — show manual hint
  if (isIOS && !evt) {
    return (
      <>
        <button
          onClick={() => setShowIOSHint(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-primary transition hover:bg-primary/20"
          aria-label="Install app"
        >
          <Download className="size-3" /> Install
        </button>
        {showIOSHint && (
          <div
            className="fixed inset-0 z-[100] grid place-items-end bg-background/60 backdrop-blur-sm sm:place-items-center"
            role="dialog"
            onClick={() => setShowIOSHint(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-t-3xl border border-border bg-background p-6 shadow-2xl sm:rounded-3xl"
            >
              <button
                onClick={() => setShowIOSHint(false)}
                aria-label="Close"
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted hover:bg-foreground/5"
              >
                <X className="size-4" />
              </button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Install on iPhone</p>
              <h3 className="mt-2 text-lg font-extrabold tracking-tight">Add to Home Screen</h3>
              <ol className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">1</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    Tap the <Share className="inline size-4 text-primary" /> <b>Share</b> button in Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">2</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    Scroll and pick <Plus className="inline size-4 text-primary" /> <b>Add to Home Screen</b>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">3</span>
                  <span>Tap <b>Add</b> — the app icon lands on your home screen.</span>
                </li>
              </ol>
              <p className="mt-4 text-[11px] text-muted">
                Make sure you're using Safari (not Chrome/in-app browsers) — Apple only allows install from Safari.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!evt) return null;

  return (
    <button
      onClick={async () => {
        await evt.prompt();
        const res = await evt.userChoice;
        if (res.outcome === "accepted") setInstalled(true);
        setEvt(null);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-primary transition hover:bg-primary/20"
      aria-label="Install app"
    >
      <Download className="size-3" /> Install
    </button>
  );
}