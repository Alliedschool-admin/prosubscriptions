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
  UserPlus,
  Users,
  Contact,
  Megaphone,
  Ticket,
} from "lucide-react";
import { LineChart, Palette } from "lucide-react";
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
import { useI18n } from "../../lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageInput } from "@/components/ImageInput";
import { SalesAnalyticsPanel } from "@/components/admin/SalesAnalyticsPanel";
import { BroadcastPanel } from "@/components/admin/BroadcastPanel";
import { AppearancePanel } from "@/components/admin/AppearancePanel";
import { MobileAppPanel } from "@/components/admin/MobileAppPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Digital Chacho" },
      { name: "description", content: "Manage products, payment methods and order verifications." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Tab =
  | "products"
  | "methods"
  | "orders"
  | "accounts"
  | "requests"
  | "admins"
  | "users"
  | "posts"
  | "coupons"
  | "analytics"
  | "broadcasts"
  | "appearance"
  | "mobile";

function AdminTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useI18n();
  const items = [
    { id: "products" as const, label: t("tab.products"), icon: Package },
    { id: "methods" as const, label: t("tab.methods"), icon: Wallet },
    { id: "orders" as const, label: t("tab.orders"), icon: Inbox },
    { id: "accounts" as const, label: t("tab.accounts"), icon: BarChart3 },
    { id: "requests" as const, label: t("tab.requests"), icon: MessageSquare },
    { id: "admins" as const, label: t("tab.admins"), icon: Users },
    { id: "users" as const, label: t("tab.users"), icon: Contact },
    { id: "posts" as const, label: t("tab.posts"), icon: Megaphone },
    { id: "coupons" as const, label: t("tab.coupons"), icon: Ticket },
    { id: "analytics" as const, label: "Analytics", icon: LineChart },
    { id: "broadcasts" as const, label: "Broadcasts", icon: Send },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "mobile" as const, label: "Mobile App", icon: Smartphone },
  ];
  return (
    <nav
      className="no-scrollbar mb-6 -mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth rounded-xl border border-border bg-background/70 p-1 backdrop-blur [mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)] sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:[mask-image:none] md:grid-cols-6 xl:grid-cols-6"
      aria-label="Admin sections"
      role="tablist"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            role="tab"
            aria-current={active ? "page" : undefined}
            aria-selected={active}
            className={`inline-flex shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition sm:w-full sm:text-xs ${
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

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
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8 lg:max-w-6xl lg:px-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Admin Console · Restricted
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Admin control</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-mono">{user?.email}</span>.
        </p>
      </header>

      <VisitorStats />

      <AdminTabs tab={tab} setTab={setTab} />

      {tab === "products" && <ProductsPanel />}
      {tab === "methods" && <MethodsPanel />}
      {tab === "orders" && <OrdersPanel />}
      {tab === "accounts" && <AccountsPanel />}
      {tab === "requests" && <RequestsAdminPanel />}
      {tab === "admins" && <AdminsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "posts" && <PostsAdminPanel />}
      {tab === "coupons" && <CouponsPanel />}
      {tab === "analytics" && <SalesAnalyticsPanel />}
      {tab === "broadcasts" && <BroadcastPanel />}
      {tab === "appearance" && <AppearancePanel />}
      {tab === "mobile" && <MobileAppPanel />}

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

  const { data: purchaseCounts = [] } = useQuery({
    queryKey: ["product-purchase-counts"],
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (fn: string) => Promise<{
          data: { product_id: string; purchase_count: number }[] | null;
          error: { message: string } | null;
        }>
      )("product_purchase_counts");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const countByProduct = new Map(purchaseCounts.map((r) => [r.product_id, Number(r.purchase_count)]));

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<Category>(CAT_OPTIONS[0]);
  const [isFree, setIsFree] = useState(false);
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
    setIsFree(false);
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
    const usdNum = isFree ? 0 : (priceUsd.trim() === "" ? null : Number(priceUsd));
    const pkrNum = isFree ? 0 : (pricePkr.trim() === "" ? null : Number(pricePkr));
    const costUsdNum = costUsd.trim() === "" ? null : Number(costUsd);
    const costPkrNum = costPkr.trim() === "" ? null : Number(costPkr);
    if (!isFree) {
      if (usdNum != null && (!Number.isFinite(usdNum) || usdNum < 0)) {
        toast.error("Enter a valid USD price.");
        return;
      }
      if (pkrNum != null && (!Number.isFinite(pkrNum) || pkrNum < 0)) {
        toast.error("Enter a valid PKR price.");
        return;
      }
      if ((usdNum == null || usdNum === 0) && (pkrNum == null || pkrNum === 0)) {
        toast.error("Set at least one price (USD or PKR), or mark it Free.");
        return;
      }
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
        is_free: isFree,
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
            <input type="number" min="0" step="0.01" disabled={isFree} value={isFree ? "" : priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder={isFree ? "Free" : "29"} className="input font-mono disabled:opacity-50" />
          </Field>
          <Field label="Price (PKR)" hint="Leave blank if PKR not offered.">
            <input type="number" min="0" step="1" disabled={isFree} value={isFree ? "" : pricePkr} onChange={(e) => setPricePkr(e.target.value)} placeholder={isFree ? "Free" : "7999"} className="input font-mono disabled:opacity-50" />
          </Field>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-foreground">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="size-4 accent-emerald-500" />
          Free product · buyers claim instantly with no approval or checkout
        </label>
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
        <Field label="Product image" hint="Paste a URL or upload from your device. Leave blank to use a default cover.">
          <ImageInput value={image} onChange={setImage} folder="products" />
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
              <ProductRow key={p.id} product={p} onDelete={onDelete} purchaseCount={countByProduct.get(p.id) ?? 0} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ---------------- Coupons ---------------- */

type CouponRow = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  currency: string | null;
  min_amount: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
};

const COUPONS_QUERY_KEY = ["admin", "coupons"] as const;

function CouponsPanel() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: COUPONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CouponRow[];
    },
  });

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState<"" | "USD" | "PKR">("");
  const [minAmount, setMinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setCode("");
    setKind("percent");
    setValue("");
    setCurrency("");
    setMinAmount("");
    setMaxUses("");
    setExpiresAt("");
    setNote("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    const num = Number(value);
    if (!trimmed) return toast.error("Code is required.");
    if (!Number.isFinite(num) || num <= 0) return toast.error("Value must be > 0.");
    if (kind === "percent" && num > 100) return toast.error("Percent must be ≤ 100.");
    if (kind === "fixed" && !currency) return toast.error("Pick a currency for a fixed discount.");

    setBusy(true);
    try {
      const { error } = await supabase.from("coupons").insert({
        code: trimmed,
        kind,
        value: num,
        currency: currency || null,
        min_amount: minAmount.trim() === "" ? 0 : Number(minAmount),
        max_uses: maxUses.trim() === "" ? null : Number(maxUses),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        note: note.trim() || null,
        active: true,
      });
      if (error) throw error;
      toast.success(`Coupon ${trimmed} created.`);
      reset();
      qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: CouponRow) {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ active: !row.active })
        .eq("id", row.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function remove(row: CouponRow) {
    if (!confirm(`Delete coupon ${row.code}?`)) return;
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", row.id);
      if (error) throw error;
      toast(`${row.code} deleted.`);
      qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function formatValue(row: CouponRow) {
    return row.kind === "percent"
      ? `${row.value}% off`
      : `${row.currency ?? ""} ${row.value} off`.trim();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH20"
              className="input font-mono uppercase"
            />
          </Field>
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")} className="input">
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "percent" ? "Percent" : "Amount off"}>
            <input
              required
              type="number"
              min="0"
              step={kind === "percent" ? "1" : "0.01"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === "percent" ? "20" : "5"}
              className="input font-mono"
            />
          </Field>
          <Field label="Currency" hint={kind === "fixed" ? "Required for fixed." : "Restrict to one currency (optional)."}>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "" | "USD" | "PKR")}
              className="input"
            >
              <option value="">Any</option>
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum spend" hint="0 for none.">
            <input
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="input font-mono"
            />
          </Field>
          <Field label="Max uses" hint="Blank = unlimited.">
            <input
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="100"
              className="input font-mono"
            />
          </Field>
        </div>
        <Field label="Expires at" hint="Optional. Local time.">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="input font-mono"
          />
        </Field>
        <Field label="Internal note" hint="Not shown to buyers.">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        </Field>
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {coupons.length} codes total
          </span>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <Plus className="size-4" /> {busy ? "Creating…" : "Create coupon"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Existing codes</p>
          <h2 className="text-2xl font-extrabold tracking-tight">MANAGE</h2>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : coupons.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <Ticket className="size-6 text-muted" />
            <p className="mt-3 text-sm text-muted">No coupons yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {coupons.map((c) => {
              const expired = c.expires_at ? new Date(c.expires_at) <= new Date() : false;
              const exhausted = c.max_uses != null && c.uses_count >= c.max_uses;
              return (
                <li key={c.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-extrabold uppercase tracking-widest">{c.code}</p>
                      <p className="text-xs text-muted">
                        {formatValue(c)}
                        {c.min_amount > 0 && ` · min ${c.min_amount}`}
                        {c.currency && ` · ${c.currency}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!c.active && (
                        <span className="rounded bg-muted/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                          Off
                        </span>
                      )}
                      {expired && (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive">
                          Expired
                        </span>
                      )}
                      {exhausted && (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive">
                          Used up
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted">
                    <span>
                      Uses: <span className="font-mono text-foreground">{c.uses_count}{c.max_uses != null ? `/${c.max_uses}` : ""}</span>
                    </span>
                    <span>
                      Expires:{" "}
                      <span className="font-mono text-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                      </span>
                    </span>
                    <span className="truncate">{c.note ?? ""}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                    >
                      {c.active ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      {c.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
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

function VisitorStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["visitor-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("visitor_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as {
        total_visits: number;
        unique_visitors: number;
        visits_today: number;
        visits_7d: number;
        visits_30d: number;
      } | null;
    },
    refetchInterval: 60_000,
  });

  const stats = [
    { label: "Lifetime visits", value: data?.total_visits },
    { label: "Unique visitors", value: data?.unique_visitors },
    { label: "Today", value: data?.visits_today },
    { label: "Last 7 days", value: data?.visits_7d },
    { label: "Last 30 days", value: data?.visits_30d },
  ];

  return (
    <section className="mb-6 rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Site traffic
        </p>
        {isLoading && <span className="text-[10px] text-muted">Loading…</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{s.label}</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">
              {s.value?.toLocaleString() ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductRow({
  product,
  onDelete,
  purchaseCount,
}: {
  product: import("../../lib/mock-data").Product;
  onDelete: (id: string, label: string) => void;
  purchaseCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const stock = product.available_stock ?? 0;
  const isFree = !!product.is_free;
  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-3">
        <img src={product.image} alt={product.name} loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {product.name}
            {isFree && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600">FREE</span>}
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
            {product.code} · {product.category}
            {!isFree && product.price_usd != null && product.price_usd > 0 ? ` · $${Number(product.price_usd)}` : ""}
            {!isFree && product.price_pkr != null && product.price_pkr > 0 ? ` · Rs ${Number(product.price_pkr).toLocaleString("en-PK")}` : ""}
            {` · ${purchaseCount} sold`}
          </p>
        </div>
        {!isFree && (<span
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
        </span>)}
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
  const [isFree, setIsFree] = useState(!!product.is_free);
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
    const usdNum = isFree ? 0 : (priceUsd.trim() === "" ? null : Number(priceUsd));
    const pkrNum = isFree ? 0 : (pricePkr.trim() === "" ? null : Number(pricePkr));
    if (!isFree) {
      if (usdNum != null && (!Number.isFinite(usdNum) || usdNum < 0)) {
        toast.error("Enter a valid USD price.");
        return;
      }
      if (pkrNum != null && (!Number.isFinite(pkrNum) || pkrNum < 0)) {
        toast.error("Enter a valid PKR price.");
        return;
      }
      if ((usdNum == null || usdNum === 0) && (pkrNum == null || pkrNum === 0)) {
        toast.error("Set at least one price (USD or PKR), or mark it Free.");
        return;
      }
    }
    const featureList = features.split("\n").map((f) => f.trim()).filter(Boolean);

    setBusy(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        code: code.trim(),
        category,
        is_free: isFree,
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
          <input type="number" min="0" step="0.01" disabled={isFree} value={isFree ? "" : priceUsd} onChange={(e) => setPriceUsd(e.target.value)} className="input font-mono disabled:opacity-50" />
        </Field>
        <Field label="Price (PKR)">
          <input type="number" min="0" step="1" disabled={isFree} value={isFree ? "" : pricePkr} onChange={(e) => setPricePkr(e.target.value)} className="input font-mono disabled:opacity-50" />
        </Field>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-foreground">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="size-4 accent-emerald-500" />
        Free product · unlimited instant claims
      </label>
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
      <Field label="Product image">
        <ImageInput value={image} onChange={setImage} folder="products" />
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
/* ---------------- Admins ---------------- */

type AdminRow = { user_id: string; email: string; granted_at: string; is_super: boolean };

function AdminsPanel() {
  const { user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["admin-invites"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: { email: string; created_at: string; invited_by_email: string | null }[] | null; error: { message: string } | null }>
      )("list_admin_invites");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function grant(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: { email: string; granted: boolean; invited: boolean }[] | null; error: { message: string } | null }>
      )("invite_admin_by_email", { _email: value });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.invited) {
        toast.success(`Invite sent to ${row.email}. They become admin on sign up.`);
      } else if (row?.granted) {
        toast.success(`${row.email} is now an admin.`);
      } else {
        toast(`${row?.email ?? value} is already an admin.`);
      }
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite admin");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteEmail: string) {
    if (!confirm(`Cancel admin invite for ${inviteEmail}?`)) return;
    setBusyInvite(inviteEmail);
    try {
      const { error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>
      )("revoke_admin_invite", { _email: inviteEmail });
      if (error) throw new Error(error.message);
      toast.success("Invite cancelled");
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invite");
    } finally {
      setBusyInvite(null);
    }
  }

  async function revoke(userId: string, targetEmail: string) {
    if (!confirm(`Remove admin access from ${targetEmail}?`)) return;
    setBusyId(userId);
    try {
      const { error } = await supabase.rpc("revoke_admin", { _user_id: userId });
      if (error) throw error;
      toast.success(`${targetEmail} is no longer an admin.`);
      qc.invalidateQueries({ queryKey: ["admins"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {isSuperAdmin ? (
        <form
          onSubmit={grant}
          className="space-y-3 rounded-2xl border border-border bg-background p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Super admin only
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">INVITE ADMIN</h2>
          <p className="text-xs text-muted">
            Enter any email. If they already have an account, they become admin instantly.
            Otherwise the invite waits and auto-grants admin the moment they sign up with that
            email.
          </p>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              maxLength={255}
              className="input"
            />
          </Field>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              <UserPlus className="size-4" /> {busy ? "Sending…" : "Invite"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted">
          Only the super admin can invite or remove other admins.
        </div>
      )}

      {isSuperAdmin && invites.length > 0 && (
        <section className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Pending</p>
          <h3 className="text-2xl font-extrabold tracking-tight">INVITES</h3>
          <ul className="mt-4 space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.email}
                className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{inv.email}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Awaiting sign up · {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => revokeInvite(inv.email)}
                  disabled={busyInvite === inv.email}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive disabled:opacity-40"
                >
                  <XIcon className="size-3.5" /> Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Current</p>
        <h3 className="text-2xl font-extrabold tracking-tight">ADMINS</h3>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No admins yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {admins.map((a) => {
              const isSelf = a.user_id === user?.id;
              const isSuperTarget = a.is_super;
              const canRemove = isSuperAdmin && !isSuperTarget;
              return (
                <li
                  key={a.user_id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {a.email}
                      {isSuperTarget && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-foreground">
                          super
                        </span>
                      )}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                          you
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Since {new Date(a.granted_at).toLocaleDateString()}
                    </p>
                  </div>
                  {canRemove ? (
                    <button
                      onClick={() => revoke(a.user_id, a.email)}
                      disabled={busyId === a.user_id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {isSuperTarget ? "Protected" : "Locked"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

type UserRow = {
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  provider: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  order_count: number;
  total_spent: number;
};

function UsersPanel() {
  const [query, setQuery] = useState("");
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: UserRow[] | null; error: { message: string } | null }>)("list_users");
      if (error) throw new Error(error.message);
      return (data ?? []) as UserRow[];
    },
  });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        [u.email, u.phone, u.full_name, u.user_id].some((v) => v && v.toLowerCase().includes(q)),
      )
    : users;

  function copy(text: string | null, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed"),
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2">
        <Contact className="size-4 text-primary" />
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Signed-in users</h2>
        <span className="ml-auto rounded-full bg-muted/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          {users.length} total
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Everyone who has signed up. Use this to reach out about orders or inquiries.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email, name, phone or id…"
        className="input mt-4 w-full"
      />

      {isLoading ? (
        <p className="mt-4 text-sm text-muted">Loading users…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load users"}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No users match.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((u) => (
            <li key={u.user_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{u.full_name || u.email || u.user_id}</p>
                    {u.is_admin && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                        Admin
                      </span>
                    )}
                    {u.provider && (
                      <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                        {u.provider}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted">{u.email ?? "—"}</p>
                  {u.phone && (
                    <p className="truncate font-mono text-xs text-muted">📞 {u.phone}</p>
                  )}
                </div>
                <div className="text-right text-[10px] font-mono uppercase tracking-widest text-muted">
                  <p>Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  {u.last_sign_in_at && (
                    <p>Last {new Date(u.last_sign_in_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px]">
                <span className="rounded-lg bg-muted/10 px-2 py-1 font-mono text-muted">
                  {u.order_count} order{u.order_count === 1 ? "" : "s"}
                </span>
                <span className="rounded-lg bg-muted/10 px-2 py-1 font-mono text-muted">
                  PKR {Number(u.total_spent || 0).toLocaleString()}
                </span>
                <div className="ml-auto flex gap-1.5">
                  {u.email && (
                    <button
                      onClick={() => copy(u.email, "Email")}
                      className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                    >
                      Copy email
                    </button>
                  )}
                  {u.phone && (
                    <button
                      onClick={() => copy(u.phone, "Phone")}
                      className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                    >
                      Copy phone
                    </button>
                  )}
                  {u.email && (
                    <a
                      href={`mailto:${u.email}`}
                      className="rounded-lg bg-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-background hover:opacity-90"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type PostRow = {
  id: string;
  title: string;
  body: string;
  category: "free_method" | "update" | "announcement";
  link: string | null;
  image: string | null;
  pinned: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

const POST_CATEGORY_LABEL: Record<PostRow["category"], string> = {
  free_method: "Free method",
  update: "Update",
  announcement: "Announcement",
};

function PostsAdminPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PostRow["category"]>("free_method");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);


  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PostRow[];
    },
  });

  function reset() {
    setTitle("");
    setBody("");
    setCategory("free_method");
    setLink("");
    setImage("");
    setPinned(false);
    setEditingId(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        category,
        link: link.trim() || null,
        image: image.trim() || null,
        pinned,
      };
      if (editingId) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
        toast.success("Post updated");
      } else {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw new Error(error.message);
        toast.success("Post published");
      }
      reset();
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(p: PostRow) {
    const { error } = await supabase.from("posts")
      .update({ published: !p.published })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-posts"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  async function togglePinned(p: PostRow) {
    const { error } = await supabase.from("posts")
      .update({ pinned: !p.pinned })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-posts"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  async function remove(p: PostRow) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    if (editingId === p.id) reset();
    qc.invalidateQueries({ queryKey: ["admin-posts"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  function edit(p: PostRow) {
    setEditingId(p.id);
    setTitle(p.title);
    setBody(p.body);
    setCategory(p.category);
    setLink(p.link ?? "");
    setImage(p.image ?? "");
    setPinned(p.pinned);
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-primary" />
          <h2 className="text-sm font-extrabold uppercase tracking-widest">
            {editingId ? "Edit post" : "Publish a post"}
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted">
          Share free methods, product updates and announcements with your customers.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="input w-full"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the details customers should see…"
            rows={5}
            className="input w-full resize-y"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PostRow["category"])}
              className="input w-full"
            >
              <option value="free_method">Free method</option>
              <option value="update">Update</option>
              <option value="announcement">Announcement</option>
            </select>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Optional link (https://…)"
              className="input w-full"
            />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
              Cover image (optional)
            </p>
            <ImageInput value={image} onChange={setImage} folder="posts" />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin to top
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Publish post"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-border px-4 text-xs font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-widest">All posts</h3>
          <span className="ml-auto rounded-full bg-muted/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            {posts.length}
          </span>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No posts yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                        {POST_CATEGORY_LABEL[p.category]}
                      </span>
                      {p.pinned && (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
                          Pinned
                        </span>
                      )}
                      {!p.published && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{p.body}</p>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        {p.link} <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  <button
                    onClick={() => edit(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  <button
                    onClick={() => togglePublished(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                  >
                    {p.published ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {p.published ? "Hide" : "Publish"}
                  </button>
                  <button
                    onClick={() => togglePinned(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/10"
                  >
                    {p.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
