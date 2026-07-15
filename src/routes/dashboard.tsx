import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Clock, CheckCircle2, XCircle, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import { useMyOrders, type Order, deleteOrder, useOrdersInvalidator } from "../lib/orders-store";
import { formatMoney, type Currency } from "../lib/price";
import { useProducts } from "../lib/products-store";
import { CommunityBanner } from "../components/CommunityBanner";

export const Route = createFileRoute("/dashboard")({
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
  const invalidateOrders = useOrdersInvalidator();

  async function handleDelete(id: string) {
    if (!confirm("Remove this order from your purchases? This cannot be undone.")) return;
    try {
      await deleteOrder(id);
      invalidateOrders();
      toast.success("Order removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove order");
    }
  }

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
                onDelete={() => handleDelete(o.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 px-4">
        <Link
          to="/requests"
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 transition-colors hover:bg-primary/[0.08]"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              <MessageSquarePlus className="mr-1 inline size-3" /> Wishlist
            </p>
            <p className="mt-1 text-sm font-bold">Request a product we don't stock</p>
            <p className="text-xs text-muted">Track your requests and admin replies in one place.</p>
          </div>
          <span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground">
            Open
          </span>
        </Link>
      </section>

      <section className="mt-10 px-4">
        <CommunityBanner compact />
      </section>
    </main>
  );
}


function OrderCard({
  order: o,
  instructions,
  onDelete,
}: {
  order: Order;
  instructions: string | null;
  onDelete: () => void;
}) {
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
      <div className="mt-3 flex justify-end">
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
          aria-label="Remove order"
        >
          <Trash2 className="size-3" /> Remove
        </button>
      </div>
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
