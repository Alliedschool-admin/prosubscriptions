import { useEffect, useState } from "react";
import { MessagesSquare, Megaphone, X } from "lucide-react";
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
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-background/60 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 sm:p-8 ${
          mounted ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.94]"
        }`}
      >
        {/* Aurora orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-64 animate-pulse rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(268 85% 68% / 0.5), transparent 70%)", animationDuration: "4s" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 size-72 animate-pulse rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(190 90% 62% / 0.45), transparent 70%)", animationDuration: "6s" }}
        />
        {/* Subtle grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "3px 3px" }}
        />

        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted backdrop-blur-md transition hover:rotate-90 hover:border-primary/50 hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="relative text-center">
          <div className="mx-auto font-mono text-[10px] uppercase tracking-[0.32em] text-muted">
            ✦ &nbsp;insider access&nbsp; ✦
          </div>

          <h2
            id="welcome-popup-title"
            className="mt-5 font-display text-[2.5rem] leading-[0.95] tracking-tight sm:text-5xl"
          >
            <span className="text-aurora">before</span>
            <br />
            <span className="text-foreground">everyone else.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[18rem] text-[13px] leading-relaxed text-muted">
            Drops, coupons, and restocks land in the group first.
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <a
              href={COMMUNITY_LINKS.group}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full bg-primary px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)] transition hover:brightness-110"
            >
              <MessagesSquare className="size-4" />
              Join WhatsApp
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href={COMMUNITY_LINKS.channel}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/80 transition hover:border-primary/40 hover:text-primary"
            >
              <Megaphone className="size-3.5" />
              Follow channel
            </a>
          </div>

          <button
            onClick={close}
            className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-muted/70 transition hover:text-foreground"
          >
            skip → keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}