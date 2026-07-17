import { useEffect, useState } from "react";
import { MessagesSquare, Megaphone, X, Sparkles, PartyPopper } from "lucide-react";
import { COMMUNITY_LINKS } from "./CommunityBanner";

const STORAGE_KEY = "welcome_popup_seen_v1";

export function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => {
          setOpen(true);
          requestAnimationFrame(() => setMounted(true));
        }, 1400);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const close = () => {
    setMounted(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setTimeout(() => setOpen(false), 220);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      className={`fixed inset-0 z-[80] flex items-center justify-center px-4 transition-opacity duration-200 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <button
        aria-label="Close welcome popup"
        onClick={close}
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-background via-background to-primary/[0.08] p-6 shadow-2xl shadow-primary/20 transition-all duration-300 sm:p-7 ${
          mounted ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.96]"
        }`}
      >
        {/* Floating orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(268 85% 68% / 0.55), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(190 90% 62% / 0.45), transparent 70%)" }}
        />

        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-border bg-background/60 text-muted backdrop-blur-md transition hover:border-primary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1">
            <Sparkles className="size-3 text-primary" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Welcome, stranger
            </span>
          </div>

          <h2
            id="welcome-popup-title"
            className="mt-4 font-display text-3xl leading-[1.05] tracking-tight sm:text-4xl"
          >
            <span className="text-chrome">Psst…</span>{" "}
            <span className="text-aurora">the good stuff</span>{" "}
            <span className="text-foreground/90">drops in the group first.</span>
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            Restock alerts, secret coupons, and "wait, that's this cheap?" moments —
            live in our WhatsApp before they hit the site. Slide in <PartyPopper className="inline size-4 text-primary" />
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={COMMUNITY_LINKS.group}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-extrabold uppercase tracking-[0.2em] text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
            >
              <MessagesSquare className="size-4" />
              Join the WhatsApp group
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href={COMMUNITY_LINKS.channel}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.2em] text-foreground backdrop-blur-md transition hover:border-primary hover:text-primary"
            >
              <Megaphone className="size-4" />
              Follow the channel
            </a>
            <button
              onClick={close}
              className="mt-1 self-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted transition hover:text-foreground"
            >
              Maybe later · keep browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}