import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, Sparkles, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../hooks/use-auth";
import {
  useMyRequests,
  createRequest,
  deleteRequest,
  useRequestsInvalidator,
  REQUEST_STATUS_LABEL,
  type ProductRequest,
} from "../lib/requests-store";

export const Route = createFileRoute("/requests")({
  validateSearch: (s: Record<string, unknown>) => ({
    request: typeof s.request === "string" ? s.request : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Requests — Pro Subscriptions" },
      { name: "description", content: "Request products we don't stock yet and track admin replies." },
      { property: "og:title", content: "My Requests" },
      { property: "og:description", content: "Request products we don't stock yet and track admin replies." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useMyRequests();
  const invalidate = useRequestsInvalidator();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.request && search.request.trim()) {
      setName(search.request);
      setOpen(true);
      setTimeout(() => {
        document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, [search.request]);

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in to request products</h1>
        <p className="mt-2 text-sm text-muted">Tell us what to stock and track admin replies here.</p>
        <Link
          to="/auth"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
        >
          Sign in
        </Link>
      </main>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error("Enter the product you want.");
      return;
    }
    setBusy(true);
    try {
      await createRequest({
        user_id: user.id,
        product_name: name.trim().slice(0, 120),
        details: details.trim().slice(0, 1000) || null,
        reference_link: link.trim().slice(0, 500) || null,
        contact: contact.trim().slice(0, 120) || null,
      });
      toast.success("Request sent. Admin will get back to you.");
      setName("");
      setDetails("");
      setLink("");
      setContact("");
      setOpen(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this request?")) return;
    try {
      await deleteRequest(id);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <main className="mx-auto max-w-2xl pb-32 lg:max-w-4xl">
      <section className="px-4 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              <MessageSquarePlus className="mr-1 inline size-3" /> Wishlist
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight">MY REQUESTS</h1>
            <p className="mt-1 text-sm text-muted">
              Don't see what you need? Ask and we'll try to arrange it.
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Plus className="size-3.5" /> {open ? "Close" : "New request"}
          </button>
        </div>
      </section>

      <section className="mt-6 px-4">
        {open && (
          <form
            onSubmit={submit}
            id="request-form"
            className="mb-4 space-y-3 rounded-2xl border border-primary/30 bg-primary/[0.03] p-4"
          >
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest">
                Product you want *
              </span>
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ChatGPT Plus 1 month"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest">
                Details / requirements
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Plan tier, duration, region, quantity, deadline…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest">
                  Reference link
                </span>
                <input
                  maxLength={500}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest">
                  Best contact
                </span>
                <input
                  maxLength={120}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="WhatsApp / Telegram / email"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
              >
                <Sparkles className="size-3.5" /> {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted">
              You haven't requested anything yet. Tell us what to stock and we'll try to arrange it.
            </p>
            {!open && (
              <button
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
              >
                <Plus className="size-3" /> Create your first request
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <RequestCard key={r.id} req={r} onDelete={remove} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function RequestCard({
  req,
  onDelete,
}: {
  req: ProductRequest;
  onDelete: (id: string) => void;
}) {
  const answered = !!req.admin_response;
  return (
    <li className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{req.product_name}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {new Date(req.created_at).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest ${
            req.status === "fulfilled"
              ? "bg-primary/15 text-primary"
              : req.status === "declined"
                ? "bg-destructive/15 text-destructive"
                : req.status === "responded"
                  ? "bg-primary/10 text-primary"
                  : "bg-foreground/5 text-muted"
          }`}
        >
          {REQUEST_STATUS_LABEL[req.status]}
        </span>
      </div>
      {req.details && (
        <p className="mt-2 whitespace-pre-line text-xs text-muted">{req.details}</p>
      )}
      {req.reference_link && (
        <a
          href={req.reference_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block truncate font-mono text-[11px] text-primary hover:underline"
        >
          {req.reference_link}
        </a>
      )}
      {answered && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/[0.05] p-3">
          <p className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
            <MessageSquare className="size-3" /> Admin reply
            {req.responded_at ? (
              <span className="ml-1 font-normal text-muted">
                · {new Date(req.responded_at).toLocaleString()}
              </span>
            ) : null}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{req.admin_response}</p>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onDelete(req.id)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-destructive"
        >
          <Trash2 className="size-3" /> Delete
        </button>
      </div>
    </li>
  );
}