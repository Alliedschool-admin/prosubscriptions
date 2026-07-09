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
  Pencil,
  Save,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { categories, type Category } from "../../lib/mock-data";
import {
  useProducts,
  createProduct,
  updateProduct,
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
  approveOrder,
  deleteOrder,
  getProofSignedUrl,
  PAYMENT_KIND_LABEL,
  useOrdersInvalidator,
  PAYMENT_METHODS_QUERY_KEY,
  type PaymentMethodKind,
} from "../../lib/orders-store";
import {
  useAllRequests,
  respondToRequest,
  deleteRequest,
  useRequestsInvalidator,
  REQUEST_STATUS_LABEL,
  type ProductRequest,
  type ProductRequestStatus,
} from "../../lib/requests-store";
import {
  useProductStock,
  addStockItems,
  deleteStockItem,
  useStockInvalidator,
} from "../../lib/stock-store";
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

type Tab = "products" | "methods" | "orders" | "accounts" | "requests";

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
            { id: "accounts", label: "Accounts", icon: BarChart3 },
            { id: "requests", label: "Requests", icon: MessageSquare },
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
      {tab === "accounts" && <AccountsPanel />}
      {tab === "requests" && <RequestsAdminPanel />}

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
  const [priceUsd, setPriceUsd] = useState("");
  const [pricePkr, setPricePkr] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [costPkr, setCostPkr] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [features, setFeatures] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setCode("");
    setCategory(CAT_OPTIONS[0]);
    setPriceUsd("");
    setPricePkr("");
    setCostUsd("");
    setCostPkr("");
    setTagline("");
    setDescription("");
    setImage("");
    setFeatures("");
    setDeliveryInstructions("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !description.trim()) {
      toast.error("Name, tagline and description are required.");
      return;
    }
    const usdNum = priceUsd.trim() === "" ? null : Number(priceUsd);
    const pkrNum = pricePkr.trim() === "" ? null : Number(pricePkr);
    const costUsdNum = costUsd.trim() === "" ? null : Number(costUsd);
    const costPkrNum = costPkr.trim() === "" ? null : Number(costPkr);
    if (usdNum != null && (!Number.isFinite(usdNum) || usdNum < 0)) {
      toast.error("Enter a valid USD price.");
      return;
    }
    if (pkrNum != null && (!Number.isFinite(pkrNum) || pkrNum < 0)) {
      toast.error("Enter a valid PKR price.");
      return;
    }
    if ((usdNum == null || usdNum === 0) && (pkrNum == null || pkrNum === 0)) {
      toast.error("Set at least one price (USD or PKR).");
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
        price_usd: usdNum,
        price_pkr: pkrNum,
        cost_usd: costUsdNum,
        cost_pkr: costPkrNum,
        tagline: tagline.trim(),
        description: description.trim(),
        image: image.trim() || DEFAULT_IMG,
        features: featureList.length ? featureList : ["Instant delivery", "Commercial license"],
        delivery_instructions: deliveryInstructions.trim() || null,
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
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">
              {CAT_OPTIONS.map((c) => (<option key={c}>{c}</option>))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (USD)" hint="Leave blank if USD not offered.">
            <input type="number" min="0" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="29" className="input font-mono" />
          </Field>
          <Field label="Price (PKR)" hint="Leave blank if PKR not offered.">
            <input type="number" min="0" step="1" value={pricePkr} onChange={(e) => setPricePkr(e.target.value)} placeholder="7999" className="input font-mono" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cost (USD)" hint="Your purchase price. Used for profit tracking.">
            <input type="number" min="0" step="0.01" value={costUsd} onChange={(e) => setCostUsd(e.target.value)} placeholder="12" className="input font-mono" />
          </Field>
          <Field label="Cost (PKR)" hint="Your purchase price. Used for profit tracking.">
            <input type="number" min="0" step="1" value={costPkr} onChange={(e) => setCostPkr(e.target.value)} placeholder="3200" className="input font-mono" />
          </Field>
        </div>
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
        <Field label="Delivery / activation instructions" hint="Shown to the buyer next to their delivered link after approval. Explain how to redeem, install, or activate.">
          <textarea
            rows={5}
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder={"1. Open the link\n2. Sign in with the email you used at checkout\n3. Paste the license key into Settings → Activate"}
            className="input resize-none"
          />
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
              <ProductRow key={p.id} product={p} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ProductRow({
  product,
  onDelete,
}: {
  product: import("../../lib/mock-data").Product;
  onDelete: (id: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const stock = product.available_stock ?? 0;
  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-3">
        <img src={product.image} alt={product.name} loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{product.name}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
            {product.code} · {product.category}
            {product.price_usd != null ? ` · $${Number(product.price_usd)}` : ""}
            {product.price_pkr != null ? ` · Rs ${Number(product.price_pkr).toLocaleString("en-PK")}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest ${
            stock === 0
              ? "bg-destructive/15 text-destructive"
              : stock <= 3
                ? "bg-primary/15 text-primary"
                : "bg-foreground/5 text-foreground"
          }`}
          title="Available stock links"
        >
          {stock} stock
        </span>
        <button
          onClick={() => setEditing((v) => !v)}
          className={`rounded-lg p-2 ${editing ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted hover:text-foreground"}`}
          aria-label="Edit product"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-foreground/5 p-2 text-muted hover:text-foreground"
          aria-label="Manage stock"
        >
          <Package className="size-4" />
        </button>
        <Link to="/products/$id" params={{ id: product.id }} className="rounded-lg bg-foreground/5 p-2 text-muted hover:text-foreground" aria-label="View">
          <ExternalLink className="size-4" />
        </Link>
        <button onClick={() => onDelete(product.id, product.name)} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/15" aria-label="Delete">
          <Trash2 className="size-4" />
        </button>
      </div>
      {editing && <EditProductForm product={product} onDone={() => setEditing(false)} />}
      {open && <StockManager productId={product.id} />}
    </li>
  );
}

function EditProductForm({
  product,
  onDone,
}: {
  product: import("../../lib/mock-data").Product;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(product.name);
  const [code, setCode] = useState(product.code);
  const [category, setCategory] = useState<Category>(product.category);
  const [priceUsd, setPriceUsd] = useState(product.price_usd == null ? "" : String(product.price_usd));
  const [pricePkr, setPricePkr] = useState(product.price_pkr == null ? "" : String(product.price_pkr));
  const [costUsd, setCostUsd] = useState(product.cost_usd == null ? "" : String(product.cost_usd));
  const [costPkr, setCostPkr] = useState(product.cost_pkr == null ? "" : String(product.cost_pkr));
  const [tagline, setTagline] = useState(product.tagline);
  const [description, setDescription] = useState(product.description);
  const [image, setImage] = useState(product.image);
  const [features, setFeatures] = useState((product.features ?? []).join("\n"));
  const [deliveryInstructions, setDeliveryInstructions] = useState(product.delivery_instructions ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !description.trim()) {
      toast.error("Name, tagline and description are required.");
      return;
    }
    const usdNum = priceUsd.trim() === "" ? null : Number(priceUsd);
    const pkrNum = pricePkr.trim() === "" ? null : Number(pricePkr);
    if (usdNum != null && (!Number.isFinite(usdNum) || usdNum < 0)) {
      toast.error("Enter a valid USD price.");
      return;
    }
    if (pkrNum != null && (!Number.isFinite(pkrNum) || pkrNum < 0)) {
      toast.error("Enter a valid PKR price.");
      return;
    }
    if ((usdNum == null || usdNum === 0) && (pkrNum == null || pkrNum === 0)) {
      toast.error("Set at least one price (USD or PKR).");
      return;
    }
    const featureList = features.split("\n").map((f) => f.trim()).filter(Boolean);

    setBusy(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        code: code.trim(),
        category,
        tagline: tagline.trim(),
        description: description.trim(),
        image: image.trim() || product.image,
        features: featureList.length ? featureList : product.features,
        price_usd: usdNum,
        price_pkr: pkrNum,
        cost_usd: costUsd.trim() === "" ? null : Number(costUsd),
        cost_pkr: costPkr.trim() === "" ? null : Number(costPkr),
        delivery_instructions: deliveryInstructions.trim() || null,
      });
      toast.success("Product updated.");
      qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-3 space-y-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-3"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Edit product</p>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono" />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">
            {CAT_OPTIONS.map((c) => (<option key={c}>{c}</option>))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (USD)">
          <input type="number" min="0" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className="input font-mono" />
        </Field>
        <Field label="Price (PKR)">
          <input type="number" min="0" step="1" value={pricePkr} onChange={(e) => setPricePkr(e.target.value)} className="input font-mono" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost (USD)">
          <input type="number" min="0" step="0.01" value={costUsd} onChange={(e) => setCostUsd(e.target.value)} className="input font-mono" />
        </Field>
        <Field label="Cost (PKR)">
          <input type="number" min="0" step="1" value={costPkr} onChange={(e) => setCostPkr(e.target.value)} className="input font-mono" />
        </Field>
      </div>
      <Field label="Tagline">
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="input" />
      </Field>
      <Field label="Description">
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" />
      </Field>
      <Field label="Image URL">
        <input value={image} onChange={(e) => setImage(e.target.value)} className="input" />
      </Field>
      <Field label="Features" hint="One per line.">
        <textarea rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} className="input resize-none" />
      </Field>
      <Field label="Delivery / activation instructions">
        <textarea
          rows={4}
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          className="input resize-none"
        />
      </Field>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
        >
          <Save className="size-3.5" /> {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function StockManager({ productId }: { productId: string }) {
  const { data: items = [], isLoading } = useProductStock(productId);
  const invalidate = useStockInvalidator();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const lines = text.split("\n");
    if (!lines.some((l) => l.trim())) {
      toast.error("Paste one link or code per line.");
      return;
    }
    setBusy(true);
    try {
      const n = await addStockItems(productId, lines);
      toast.success(`Added ${n} stock item${n === 1 ? "" : "s"}.`);
      setText("");
      invalidate(productId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this stock item?")) return;
    try {
      await deleteStockItem(id);
      invalidate(productId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const available = items.filter((i) => i.status === "available");
  const sold = items.filter((i) => i.status === "sold");

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-foreground/[0.02] p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Stock pool · one link/code per line
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={"https://drive.google.com/…\nhttps://mega.nz/…"}
        className="input font-mono"
      />
      <div className="flex justify-end">
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
        >
          <Plus className="size-3.5" /> {busy ? "Adding…" : "Add to stock"}
        </button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted">Loading stock…</p>
      ) : (
        <>
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              Available ({available.length})
            </p>
            {available.length === 0 ? (
              <p className="text-xs text-muted">No links in stock. Buyers see “Restocking soon”.</p>
            ) : (
              <ul className="space-y-1">
                {available.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{it.content}</span>
                    <button
                      onClick={() => remove(it.id)}
                      className="shrink-0 rounded p-1 text-muted hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {sold.length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                Sold ({sold.length})
              </p>
              <ul className="space-y-1">
                {sold.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 rounded-md bg-foreground/[0.03] px-2 py-1 opacity-70">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] line-through">
                      {it.content}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted">
                      {it.sold_at ? new Date(it.sold_at).toLocaleDateString() : "sold"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
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
  const [currency, setCurrency] = useState<"USD" | "PKR">("PKR");
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
        currency,
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
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as PaymentMethodKind)} className="input">
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{PAYMENT_KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "PKR")} className="input">
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
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
                      {PAYMENT_KIND_LABEL[m.kind]} · {m.currency ?? "PKR"}
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
      if (status === "approved") {
        const res = await approveOrder(id);
        if (res?.out_of_stock) {
          toast.error("Out of stock — add more stock links before approving.");
        } else {
          toast.success("Order approved · stock item delivered.");
        }
      } else {
        await reviewOrder(id, status);
        toast.success("Order rejected.");
      }
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this order? It will be removed from your account totals.")) return;
    setBusyId(id);
    try {
      await deleteOrder(id);
      toast.success("Order deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
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

              {o.status === "approved" && o.delivered_content && (
                <div className="mt-3 rounded-lg bg-primary/5 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-primary">
                    Delivered link
                  </p>
                  <p className="mt-1 truncate font-mono text-xs">{o.delivered_content}</p>
                </div>
              )}

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
                {o.status !== "pending" && (
                  <button
                    onClick={() => remove(o.id)}
                    disabled={busyId === o.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive disabled:opacity-60"
                    title="Delete order and remove from account"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
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

/* ---------------- Accounts ---------------- */

function AccountsPanel() {
  const { data: orders = [], isLoading } = useAllOrders();
  const { products } = useProducts();
  const invalidate = useOrdersInvalidator();
  const [currency, setCurrency] = useState<"USD" | "PKR">("PKR");
  const [busyId, setBusyId] = useState<string | null>(null);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const approved = orders.filter(
    (o) => o.status === "approved" && String(o.currency).toUpperCase() === currency,
  );

  let revenue = 0;
  let cogs = 0;
  for (const o of approved) {
    const qty = Number(o.quantity ?? 1);
    revenue += Number(o.amount) || 0;
    const p = productMap.get(o.item_id);
    const unitCost =
      currency === "USD" ? Number(p?.cost_usd ?? 0) : Number(p?.cost_pkr ?? 0);
    cogs += (Number.isFinite(unitCost) ? unitCost : 0) * qty;
  }
  const profit = revenue - cogs;

  let inventoryValue = 0;
  for (const p of products) {
    const stock = Number(p.available_stock ?? 0);
    const unitCost =
      currency === "USD" ? Number(p.cost_usd ?? 0) : Number(p.cost_pkr ?? 0);
    inventoryValue += (Number.isFinite(unitCost) ? unitCost : 0) * stock;
  }

  const fmt = (n: number) =>
    currency === "USD"
      ? `$${n.toFixed(2)}`
      : `Rs ${Math.round(n).toLocaleString("en-PK")}`;

  async function remove(id: string, name: string) {
    if (
      !confirm(
        `Delete sale "${name}"? This removes it from your account totals and cannot be undone.`,
      )
    )
      return;
    setBusyId(id);
    try {
      await deleteOrder(id);
      toast.success("Sale removed from account.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Store performance
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">ACCOUNTS</h2>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
          {(["PKR", "USD"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                currency === c
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Revenue" value={fmt(revenue)} tone="neutral" />
        <Stat label="Cost of goods" value={fmt(cogs)} tone="neutral" />
        <Stat
          label={profit >= 0 ? "Profit" : "Loss"}
          value={fmt(Math.abs(profit))}
          tone={profit >= 0 ? "up" : "down"}
        />
        <Stat label="Inventory value" value={fmt(inventoryValue)} tone="neutral" />
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-3 text-[11px] text-muted">
        Revenue and profit include only <span className="font-bold text-foreground">approved</span>{" "}
        sales in {currency}. Profit uses the cost you set per product. Deleting a sale below removes
        it from these totals.
      </div>

      <section className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Approved sales · {currency}
        </p>
        <h3 className="text-lg font-extrabold tracking-tight">SELL DETAILS</h3>

        {isLoading ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : approved.length === 0 ? (
          <div className="mt-3 grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <BarChart3 className="size-6 text-muted" />
            <p className="mt-3 text-sm text-muted">No approved {currency} sales yet.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {approved.map((o) => {
              const p = productMap.get(o.item_id);
              const qty = Number(o.quantity ?? 1);
              const unitCost =
                currency === "USD" ? Number(p?.cost_usd ?? 0) : Number(p?.cost_pkr ?? 0);
              const rowCogs = (Number.isFinite(unitCost) ? unitCost : 0) * qty;
              const rowProfit = Number(o.amount) - rowCogs;
              return (
                <li
                  key={o.id}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {o.item_name}{" "}
                        <span className="text-xs font-normal text-muted">× {qty}</span>
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {new Date(o.reviewed_at ?? o.created_at).toLocaleString()} ·{" "}
                        {o.sender_name}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(o.id, o.item_name)}
                      disabled={busyId === o.id}
                      className="shrink-0 rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/15 disabled:opacity-60"
                      aria-label="Delete sale from account"
                      title="Delete sale and remove from account"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <Info label="Revenue" value={fmt(Number(o.amount))} />
                    <Info label="Cost" value={fmt(rowCogs)} />
                    <Info
                      label={rowProfit >= 0 ? "Profit" : "Loss"}
                      value={fmt(Math.abs(rowProfit))}
                      mono
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}) {
  const toneClass =
    tone === "up"
      ? "text-primary"
      : tone === "down"
        ? "text-destructive"
        : "text-foreground";
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : BarChart3;
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <Icon className={`size-3.5 ${toneClass}`} />
      </div>
      <p className={`mt-2 text-xl font-extrabold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

/* ---------------- Requests ---------------- */

const REQUEST_STATUSES: ProductRequestStatus[] = [
  "new",
  "in_review",
  "responded",
  "fulfilled",
  "declined",
];

function RequestsAdminPanel() {
  const { data: requests = [], isLoading } = useAllRequests();
  const invalidate = useRequestsInvalidator();
  const [filter, setFilter] = useState<ProductRequestStatus | "all">("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

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
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...REQUEST_STATUSES] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
              filter === f
                ? "bg-foreground text-background"
                : "bg-foreground/5 text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : REQUEST_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading requests…</p>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
          <MessageSquare className="size-6 text-muted" />
          <p className="mt-3 text-sm text-muted">No customer requests here yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <RequestAdminRow
              key={r.id}
              req={r}
              onDelete={remove}
              onSaved={invalidate}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function RequestAdminRow({
  req,
  onDelete,
  onSaved,
}: {
  req: ProductRequest;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const [reply, setReply] = useState(req.admin_response ?? "");
  const [status, setStatus] = useState<ProductRequestStatus>(req.status);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (reply.trim().length < 2) {
      toast.error("Write a short response first.");
      return;
    }
    setBusy(true);
    try {
      await respondToRequest(req.id, {
        admin_response: reply.trim().slice(0, 2000),
        status,
      });
      toast.success("Response sent to customer.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{req.product_name}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {new Date(req.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {req.details && (
        <p className="mt-2 whitespace-pre-line text-xs text-muted">{req.details}</p>
      )}
      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {req.reference_link && (
          <a
            href={req.reference_link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[11px] text-primary hover:underline"
          >
            {req.reference_link}
          </a>
        )}
        {req.contact && <Info label="Contact" value={req.contact} />}
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/[0.03] p-3">
        <Field label="Your response">
          <textarea
            rows={3}
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Yes, we can source this within 24h for Rs 2,500 — reply to confirm."
            className="input resize-none"
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductRequestStatus)}
              className="input !w-auto !py-1.5"
            >
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(req.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
            >
              <Send className="size-3.5" /> {busy ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}