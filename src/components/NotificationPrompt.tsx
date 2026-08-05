import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import {
  hasAskedNotifications,
  markAskedNotifications,
  notificationPermission,
  requestNotificationPermission,
} from "../lib/notifications";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const perm = notificationPermission();
    if (perm !== "default") return;
    if (hasAskedNotifications()) return;
    const t = setTimeout(() => setShow(true), 3200);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-md sm:inset-x-auto sm:end-4 sm:bottom-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-2xl backdrop-blur-2xl">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-40 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
        />
        <div className="relative flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Bell className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Turn on announcement alerts</p>
            <p className="mt-0.5 text-xs text-muted">
              We'll ping you about restocks, price drops and important updates. No spam, ever.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  const r = await requestNotificationPermission();
                  setShow(false);
                  if (r === "granted") toast.success("Alerts enabled");
                  else if (r === "denied") toast.error("You can enable them later in Tools → Alerts");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25"
                style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
              >
                Allow
              </button>
              <button
                onClick={() => {
                  markAskedNotifications();
                  setShow(false);
                }}
                className="rounded-xl border border-border/70 px-3 py-2 text-sm font-semibold text-muted hover:text-foreground"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              markAskedNotifications();
              setShow(false);
            }}
            aria-label="Dismiss"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
