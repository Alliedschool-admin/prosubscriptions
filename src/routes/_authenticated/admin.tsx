import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Package,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Wallet,
  Inbox,
  Check,
  X as XIcon,
  Eye,
  EyeOff,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { categories, type Category } from "../../lib/mock-data";
import {
  useProducts,
  createProduct,
  deleteProduct as deleteProductRow,
  PRODUCTS_QUERY_KEY,
} from "../../lib/products-store";
import {
  usePaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  useAllOrders,
  reviewOrder,
  getProofSignedUrl,
  PAYMENT_KIND_LABEL,
  useOrdersInvalidator,
  PAYMENT_METHODS_QUERY_KEY,
  type PaymentMethodKind,
} from "../../lib/orders-store";
import { useAuth } from "../../hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Pro Subscriptions" },
      { name: "description", content: "Manage products, payment methods and order verifications." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab = "products" | "methods" | "orders";

function Admin() {
  const { user, isAdmin, refresh, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      if (data === true) {
        toast.success("You are now the admin.");
        await refresh();
      } else {
        toast.error("An admin already exists. Ask them to grant you access.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim admin");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-foreground text-background">
          <ShieldCheck className="size-6" />
        </div>
        <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Restricted
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Admin access required</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-mono">{user?.email}</span>. If you're the vault owner,
          claim the first admin seat — this button only works while no admin exists.
        </p>
        <button
          onClick={claim}
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {busy ? "Claiming…" : "Claim first admin"}
        </button>
        <button
          onClick={() => signOut()}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <LogOut className="size-3" /> Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Admin Console · Restricted
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Admin control</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-mono">{user?.email}</span>.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 rounded-xl border border-border bg-background p-1">
        {(
          [
            { id: "products", label: "Products", icon: Package },
            { id: "methods", label: "Payment", icon: Wallet },
            { id: "orders", label: "Orders", icon: Inbox },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
              tab === id ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </nav>

      {tab === "products" && <ProductsPanel />}
      {tab === "methods" && <MethodsPanel />}
      {tab === "orders" && <OrdersPanel />}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);
        }
      `}</style>
    </main>
  );
}

/* ---------------- Products ---------------- */

const CAT_OPTIONS = categories.filter((c) => c !== "All") as Category[];
const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";

function ProductsPanel() {
  const { products, refetch } = useProducts();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<Category>(CAT_OPTIONS[0]);
  const [price, setPrice] = useState("29");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [features, setFeatures] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setCode("");
    setCategory(CAT_OPTIONS[0]);
    setPrice("29");
    setTagline("");
    setDescription("");
    setImage("");
    setFeatures("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !description.trim()) {
      toast.error("Name, tagline and description are required.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    const featureList = features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setBusy(true);
    try {
      const created = await createProduct({
        name: name.trim(),
        code: code.trim() || `VLT-${String(Math.floor(Math.random() * 900) + 100)}`,
        category,
        price: priceNum,
        tagline: tagline.trim(),
        description: description.trim(),
        image: image.trim() || DEFAULT_IMG,
        features: featureList.length ? featureList : ["Instant delivery", "Commercial license"],
      });
      toast.success(`${created.name} posted.`);
      reset();
      qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post product");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`Delete ${label}?`)) return;
    try {
      await deleteProductRow(id);
      toast(`${label} removed.`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="QUANTUM ICONS" className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VLT-042" className="input font-mono" />
          </Field>
          <Field label="Price (USD)">
            <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} className="input font-mono" />
          </Field>
        </div>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">
            {CAT_OPTIONS.map((c) => (<option key={c}>{c}</option>))}
          </select>
        </Field>
        <Field label="Tagline">
          <input required value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="500 pixel-perfect icons for modern UIs" className="input" />
        </Field>
        <Field label="Description">
          <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" />
        </Field>
        <Field label="Image URL" hint="Leave blank to use a default cover.">
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className="input" />
        </Field>
        <Field label="Features" hint="One per line.">
          <textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} className="input resize-none" />
        </Field>
        <div className="flex items-center justify-between pt-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {products.length} live in the vault
          </span>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <Plus className="size-4" /> {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">All assets</p>
          <h2 className="text-2xl font-extrabold tracking-tight">MANAGE</h2>
        </div>

        {products.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <Package className="size-6 text-muted" />
            <p className="mt-3 text-sm text-muted">Nothing yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <img src={p.image} alt={p.name} loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                    {p.code} · {p.category} · ${p.price}
                  </p>
                </div>
                <Link to="/products/$id" params={{ id: p.id }} className="rounded-lg bg-foreground/5 p-2 text-muted hover:text-foreground" aria-label="View">
                  <ExternalLink className="size-4" />
                </Link>
                <button onClick={() => onDelete(p.id, p.name)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/15" aria-label="Delete">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ---------------- Payment Methods ---------------- */

const KIND_OPTIONS: PaymentMethodKind[] = [
  "jazzcash",
  "easypaisa",
  "nayapay",
  "sadapay",
  "bank",
  "binance_pay",
  "crypto",
  "other",
];

function MethodsPanel() {
  const { data: methods = [], refetch } = usePaymentMethods({ activeOnly: false });
  const qc = useQueryClient();

  const [kind, setKind] = useState<PaymentMethodKind>("jazzcash");
  const [label, setLabel] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !accountNumber.trim()) {
      toast.error("Label and account number/address are required.");
      return;
    }
    setBusy(true);
    try {
      await createPaymentMethod({
        kind,
        label: label.trim(),
        account_name: accountName.trim() || null,
        account_number: accountNumber.trim(),
        instructions: instructions.trim() || null,
        sort_order: methods.length,
        active: true,
      });
      toast.success("Payment method added.");
      setLabel("");
      setAccountName("");
      setAccountNumber("");
      setInstructions("");
      qc.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await updatePaymentMethod(id, { active: !active });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await deletePaymentMethod(id);
      toast(`${name} removed.`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <form onSubmit={add} className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as PaymentMethodKind)} className="input">
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{PAYMENT_KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Label">
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Personal JazzCash" className="input" />
          </Field>
        </div>
        <Field label="Account holder name">
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Muhammad Khalil" className="input" />
        </Field>
        <Field label="Account number / IBAN / wallet address / Binance ID">
          <input required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="03XX-XXXXXXX" className="input font-mono" />
        </Field>
        <Field label="Instructions" hint="Shown to the buyer at checkout. e.g. network (TRC20), memo, hours to confirm.">
          <textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Send exact amount. Include your order number in the note." className="input resize-none" />
        </Field>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">
            <Plus className="size-4" /> {busy ? "Adding…" : "Add method"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Configured</p>
        <h2 className="text-2xl font-extrabold tracking-tight">METHODS</h2>

        {methods.length === 0 ? (
          <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <Wallet className="size-6 text-muted" />
            <p className="mt-3 text-sm text-muted">Add JazzCash, Easypaisa, Binance, bank etc.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {methods.map((m) => (
              <li key={m.id} className={`rounded-xl border p-4 ${m.active ? "border-border bg-background" : "border-border bg-foreground/[0.03] opacity-70"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{m.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {PAYMENT_KIND_LABEL[m.kind]}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(m.id, m.active)} className="rounded-lg bg-foreground/5 p-2 text-muted hover:text-foreground" aria-label={m.active ? "Disable" : "Enable"}>
                      {m.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button onClick={() => remove(m.id, m.label)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/15" aria-label="Delete">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 truncate font-mono text-sm">{m.account_number}</p>
                {m.account_name && <p className="text-xs text-muted">{m.account_name}</p>}
                {m.instructions && <p className="mt-1 whitespace-pre-line text-xs text-muted">{m.instructions}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ---------------- Orders ---------------- */

function OrdersPanel() {
  const { data: orders = [], isLoading } = useAllOrders();
  const invalidate = useOrdersInvalidator();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      await reviewOrder(id, status);
      toast.success(`Order ${status}.`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function viewProof(path: string) {
    try {
      const url = await getProofSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load proof");
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
              filter === f ? "bg-foreground text-background" : "bg-foreground/5 text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading orders…</p>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
          <Inbox className="size-6 text-muted" />
          <p className="mt-3 text-sm text-muted">No {filter === "all" ? "" : filter} orders.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{o.item_name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    VLT-{o.id.slice(0, 6).toUpperCase()} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Info label="Amount" value={`${o.currency} ${Number(o.amount).toFixed(2)}`} />
                <Info label="Method" value={o.payment_method_label ?? "—"} />
                <Info label="Sender" value={o.sender_name} />
                <Info label="Contact" value={o.sender_contact} />
                {o.transaction_ref && <Info label="Tx ref" value={o.transaction_ref} mono />}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {o.proof_path && (
                  <button
                    onClick={() => viewProof(o.proof_path!)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-foreground/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground"
                  >
                    <ImageIcon className="size-3.5" /> View proof
                  </button>
                )}
                {o.status === "pending" && (
                  <>
                    <button
                      onClick={() => decide(o.id, "approved")}
                      disabled={busyId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
                    >
                      <Check className="size-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => decide(o.id, "rejected")}
                      disabled={busyId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive disabled:opacity-60"
                    >
                      <XIcon className="size-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    approved: "bg-primary/15 text-primary",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${map[status] ?? "bg-foreground/5 text-muted"}`}>
      {status}
    </span>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`truncate text-xs ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}