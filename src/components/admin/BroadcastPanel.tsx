import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Megaphone, Trash2, EyeOff, Eye, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBroadcasts,
  createBroadcast,
  setBroadcastActive,
  deleteBroadcast,
  BROADCASTS_KEY,
} from "@/lib/broadcast-store";

export function BroadcastPanel() {
  const qc = useQueryClient();
  const { data: broadcasts = [] } = useBroadcasts({ activeOnly: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: BROADCASTS_KEY });
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await createBroadcast(message.trim());
      setMessage("");
      refresh();
      toast.success("Broadcast sent to all visitors");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    try {
      await setBroadcastActive(id, active);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this broadcast?")) return;
    try {
      await deleteBroadcast(id);
      refresh();
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={send} className="rounded-2xl border border-border bg-background/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Megaphone className="size-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Send site-wide announcement
          </p>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. 50% off Netflix Premium this weekend only!"
          rows={3}
          maxLength={280}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted">{message.length}/280</span>
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            <Send className="size-3" /> {busy ? "Sending…" : "Broadcast"}
          </button>
        </div>
      </form>

      <section>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          History ({broadcasts.length})
        </p>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-muted">No broadcasts yet.</p>
        ) : (
          <ul className="space-y-2">
            {broadcasts.map((b) => (
              <li
                key={b.id}
                className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                  b.active ? "border-primary/40 bg-primary/5" : "border-border bg-background/40 opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm">{b.message}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {new Date(b.created_at).toLocaleString()} · {b.active ? "Live" : "Hidden"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => toggle(b.id, !b.active)}
                    className="grid size-8 place-items-center rounded-md border border-border text-muted hover:text-foreground"
                    aria-label={b.active ? "Hide" : "Show"}
                  >
                    {b.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => remove(b.id)}
                    className="grid size-8 place-items-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}