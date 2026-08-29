import { MessagesSquare, Megaphone, ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";

export const COMMUNITY_LINKS = {
  group: "https://chat.whatsapp.com/JxpeRwwPP2wJJYfB4IqVi1",
  channel: "https://whatsapp.com/channel/0029Vb8Jo8F7YScvDSA5a13S",
} as const;

export function CommunityPill() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/[0.10] via-background to-background px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <MessagesSquare className="size-3.5" />
          </span>
          <span className="truncate text-xs font-extrabold tracking-tight">
            Join our community — good stuff drops first
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 flex gap-2">
          <a
            href={COMMUNITY_LINKS.group}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground"
          >
            <MessagesSquare className="size-3.5" /> Group <ArrowUpRight className="size-3.5" />
          </a>
          <a
            href={COMMUNITY_LINKS.channel}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-foreground"
          >
            <Megaphone className="size-3.5" /> Channel <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export function CommunityBanner({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-background to-background p-4 ${
        compact ? "" : "sm:p-5"
      }`}
      aria-label="Join our community"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <MessagesSquare className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Join first · Get updates
          </p>
          <h3 className="mt-1 text-base font-extrabold tracking-tight sm:text-lg">
            Come inside the community
          </h3>
          <p className="mt-1 text-xs text-muted">
            New drops, restock alerts and quick answers to your queries — join the WhatsApp group
            for chat, follow the channel for announcements.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <a
              href={COMMUNITY_LINKS.group}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
            >
              <MessagesSquare className="size-3.5" /> Join WhatsApp group
              <ArrowUpRight className="size-3.5" />
            </a>
            <a
              href={COMMUNITY_LINKS.channel}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-extrabold uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"
            >
              <Megaphone className="size-3.5" /> Follow channel
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}