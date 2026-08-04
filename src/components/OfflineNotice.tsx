import { CloudOff, RefreshCw } from "lucide-react";
import { requestSync, useOnline } from "@/hooks/use-online";

/** Slim banner shown while the app is running from its on-device store copy. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-border bg-card/90 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted backdrop-blur">
      <CloudOff className="size-3.5 text-primary" />
      Offline · showing your saved store
      <button
        onClick={requestSync}
        className="ml-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground"
      >
        <RefreshCw className="size-3" /> Sync
      </button>
    </div>
  );
}

/** Blocking card for actions that genuinely need the server. */
export function OfflineGate({ action = "continue" }: { action?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
        <CloudOff className="size-5" />
      </div>
      <p className="mt-3 text-base font-extrabold tracking-tight">You&apos;re offline</p>
      <p className="mt-1 text-sm text-muted">
        Connect to the internet to {action}. Browsing your saved store keeps working without a
        connection.
      </p>
      <button
        onClick={requestSync}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground"
      >
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );
}
