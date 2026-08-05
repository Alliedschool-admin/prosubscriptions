import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Megaphone, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showNotification } from "@/lib/notifications";

const DISMISSED_KEY = "dismissed-broadcasts";

type Broadcast = { id: string; message: string; created_at: string };

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function addDismissed(id: string) {
  try {
    const s = getDismissed();
    s.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(s).slice(-100)));
  } catch {
    /* ignore */
  }
}

function BroadcastCard({ b, onClose }: { b: Broadcast; onClose: (id: string) => void }) {
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const t = measureRef.current;
    const box = boxRef.current;
    if (!t || !box) return;
    setOverflow(t.scrollWidth > box.clientWidth - 8);
  }, [b.message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="broadcast-card group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 pr-11 text-white sm:px-4 sm:py-3"
    >
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur">
        <span className="absolute inset-0 rounded-xl pulse-ring" aria-hidden />
        <Megaphone className="size-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="mb-0.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/85">
          <Sparkles className="size-3" />
          <span>Live announcement</span>
          <span aria-hidden className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
        </p>
        <div ref={boxRef} className="relative overflow-hidden">
          {overflow ? (
            <div className="broadcast-marquee-track text-[13px] font-semibold leading-snug sm:text-sm">
              <span className="pr-12">{b.message}</span>
              <span className="pr-12" aria-hidden>{b.message}</span>
            </div>
          ) : (
            <span className="block text-[13px] font-semibold leading-snug sm:text-sm">
              {b.message}
            </span>
          )}
          {/* hidden measurer to detect overflow */}
          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-[13px] font-semibold sm:text-sm"
          >
            {b.message}
          </span>
        </div>
      </div>

      <button
        onClick={() => onClose(b.id)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white/90 ring-1 ring-white/25 backdrop-blur transition hover:bg-black/40 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function BroadcastListener() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const loadedRef = useRef(false);

  function pushItem(b: Broadcast) {
    const dismissed = getDismissed();
    if (dismissed.has(b.id)) return;
    setItems((prev) => (prev.some((x) => x.id === b.id) ? prev : [...prev, b].slice(-3)));
  }

  function close(id: string) {
    addDismissed(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const { data } = await (
        supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>
      )("broadcasts")
        .select("id,message,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      const rows = (data ?? []) as Broadcast[];
      rows.slice().reverse().forEach(pushItem);
    })();

    const channel = supabase
      .channel("broadcasts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload) => {
          const row = payload.new as Broadcast & { active: boolean };
          if (row.active) {
            pushItem({ id: row.id, message: row.message, created_at: row.created_at });
            showNotification("Digital Chacho — announcement", row.message, `bc-${row.id}`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-2 sm:px-4"
      aria-label="Site announcements"
    >
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2">
        {items.map((b) => (
          <BroadcastCard key={b.id} b={b} onClose={close} />
        ))}
      </div>
    </div>
  );
}