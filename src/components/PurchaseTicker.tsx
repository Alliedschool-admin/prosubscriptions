import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; first_name: string; item_name: string; created_at: string };

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function PurchaseTicker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.rpc("recent_purchases_public" as never);
      if (alive && Array.isArray(data)) setRows(data as Row[]);
    }
    load();
    const channel = supabase
      .channel("purchase-ticker")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (rows.length < 2) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % rows.length);
        setVisible(true);
      }, 300);
    }, 6500);
    return () => clearInterval(t);
  }, [rows.length]);

  if (dismissed || rows.length === 0) return null;
  const r = rows[idx];
  if (!r) return null;

  return (
    <div
      className={`pointer-events-auto fixed bottom-24 left-3 z-40 max-w-[280px] rounded-2xl border border-border/70 bg-background/85 p-3 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:bottom-6 sm:left-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-border bg-background text-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <ShoppingBag className="size-4" />
        </span>
        <div className="min-w-0 text-xs">
          <p className="truncate">
            <span className="font-bold text-foreground">{r.first_name}</span>{" "}
            <span className="text-muted">just got</span>{" "}
            <span className="truncate font-semibold text-foreground">{r.item_name}</span>
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
            <span className="text-emerald-500">● verified</span> · {timeAgo(r.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}