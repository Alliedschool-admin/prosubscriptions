import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Clock, CheckCircle2, XCircle, Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../hooks/use-auth";
import { useMyOrders, type Order } from "../lib/orders-store";
import { formatMoney, type Currency } from "../lib/price";
import { useProducts } from "../lib/products-store";
import { CommunityBanner } from "../components/CommunityBanner";
import {
  useMyRequests,
  createRequest,
  deleteRequest,
  useRequestsInvalidator,
  REQUEST_STATUS_LABEL,
  type ProductRequest,
} from "../lib/requests-store";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>) => ({
    request: typeof s.request === "string" ? s.request : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Purchases — Pro Subscriptions" },
      { name: "description", content: "Your orders and purchased download links." },
      { property: "og:title", content: "My Purchases" },
      { property: "og:description", content: "Your orders and purchased download links." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useMyOrders();
  const { getProduct } = useProducts();

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in to see your purchases</h1>
        <p className="mt-2 text-sm text-muted">Your purchases and delivered links appear here.</p>
        <Link
          to="/auth"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const initials =
    (user.email ?? "?")
      .split(/[@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <main className="mx-auto max-w-2xl pb-32">
      <section className="px-4 pt-8">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-foreground font-mono text-sm font-bold text-background">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Signed in</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{user.email}</h1>
          </div>
        </div>
      </section>

      <section className="mt-8 px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Your orders</p>
            <h2 className="text-2xl font-extrabold tracking-tight">MY PURCHASES</h2>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted">No orders yet. Browse the store to buy your first item.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
            >
              Browse store
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                instructions={
                  o.item_kind === "product" ? getProduct(o.item_id)?.delivery_instructions ?? null : null
                }
              />
            ))}
          </ul>
        )}
      </section>

      <RequestsSection />

      <section className="mt-10 px-4">
        <CommunityBanner compact />
      </section>
    </main>
  );
}

function RequestsSection() {
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useMyRequests();
  const invalidate = useRequestsInvalidator();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (search.request && search.request.trim()) {
      setName(search.request);
      setOpen(true);
      // Scroll into view so user sees the prefilled form
      setTimeout(() => {
        document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.request]);

  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

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
    <section className="mt-10 px-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Don't see what you need?
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">REQUEST A PRODUCT</h2>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="size-3.5" /> {open ? "Close" : "New request"}
        </button>
      </div>

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
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          You haven't requested anything yet. Tell us what to stock and we'll try to arrange it.
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} req={r} onDelete={remove} />
          ))}
        </ul>
      )}
    </section>
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

function OrderCard({ order: o, instructions }: { order: Order; instructions: string | null }) {
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  }
  return (
    <li className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {o.item_name}
            {o.quantity && o.quantity > 1 ? (
              <span className="ml-1 font-mono text-xs text-muted">× {o.quantity}</span>
            ) : null}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            VLT-{o.id.slice(0, 6).toUpperCase()} · {new Date(o.created_at).toLocaleString()}
          </p>
        </div>
        <StatusPill status={o.status} />
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        {formatMoney((o.currency as Currency) ?? "USD", Number(o.amount))} · {o.payment_method_label ?? "—"}
      </p>

      {o.status === "approved" && o.delivered_content && (
        <DeliveredLinks
          content={o.delivered_content}
          instructions={instructions}
          onCopy={copy}
        />
      )}

      {o.status === "pending" && (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
          <Clock className="size-3" /> Awaiting admin verification
        </p>
      )}
      {o.status === "rejected" && o.admin_note && (
        <p className="mt-3 text-xs text-destructive">Reason: {o.admin_note}</p>
      )}
    </li>
  );
}

function DeliveredLinks({
  content,
  instructions,
  onCopy,
}: {
  content: string;
  instructions: string | null;
  onCopy: (text: string) => void;
}) {
  const items = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const multi = items.length > 1;

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          {multi ? `Your downloads (${items.length})` : "Your download"}
        </p>
        {multi && (
          <button
            onClick={() => onCopy(items.join("\n"))}
            className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
          >
            <Copy className="size-3" /> Copy all
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={`${idx}-${item}`}
            className="flex items-center gap-2 rounded-md border border-primary/20 bg-background px-3 py-2"
          >
            {multi && (
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                {idx + 1}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{item}</span>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => onCopy(item)}
                className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
              >
                <Copy className="size-3" /> Copy
              </button>
              {/^https?:\/\//.test(item) && (
                <a
                  href={item}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
                >
                  Open
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {instructions && (
            <div className="mt-2 rounded-md border border-primary/20 bg-background/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                How to activate
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/90">
                {instructions}
              </p>
            </div>
          )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
        <CheckCircle2 className="size-3" /> Delivered
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
        <XCircle className="size-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-yellow-700 dark:text-yellow-400">
      <Clock className="size-3" /> Pending
    </span>
  );
}
