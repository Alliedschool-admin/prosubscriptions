import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, Package, ExternalLink, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { categories, type Category } from "../../lib/mock-data";
import {
  useProducts,
  createProduct,
  deleteProduct as deleteProductRow,
  PRODUCTS_QUERY_KEY,
} from "../../lib/products-store";
import { useAuth } from "../../hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Vault.01" },
      { name: "description", content: "Post and manage products in the vault catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const CAT_OPTIONS = categories.filter((c) => c !== "All") as Category[];
const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";

function Admin() {
  const { user, isAdmin, refresh, signOut } = useAuth();
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
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to claim admin");
    } finally {
      setBusy(false);
    }
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
      toast.success(`${created.name} posted to the vault.`);
      reset();
      qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post product");
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
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete");
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

  const customProducts = products; // all live products are managed here

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Admin Console · Restricted
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Post a new asset</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="font-mono">{user?.email}</span>. New drops appear instantly
          on the Discover feed.
        </p>
      </header>

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
            {CAT_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Tagline">
          <input required value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="500 pixel-perfect icons for modern UIs" className="input" />
        </Field>
        <Field label="Description">
          <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full product description shown on the detail page." className="input resize-none" />
        </Field>
        <Field label="Image URL" hint="Leave blank to use a default cover.">
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className="input" />
        </Field>
        <Field label="Features" hint="One per line.">
          <textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={"Instant download\nCommercial license\nFree lifetime updates"} className="input resize-none" />
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

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">All assets</p>
            <h2 className="text-2xl font-extrabold tracking-tight">MANAGE</h2>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            {customProducts.length}
          </span>
        </div>

        {customProducts.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-background p-10 text-center">
            <Package className="size-6 text-muted" />
            <p className="mt-3 text-sm text-muted">Nothing yet. Add your first drop above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {customProducts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <img src={p.image} alt={p.name} loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                    {p.code} · {p.category} · ${p.price}
                  </p>
                </div>
                <Link
                  to="/products/$id"
                  params={{ id: p.id }}
                  className="rounded-lg bg-foreground/5 p-2 text-muted hover:text-foreground"
                  aria-label="View"
                >
                  <ExternalLink className="size-4" />
                </Link>
                <button
                  onClick={() => onDelete(p.id, p.name)}
                  className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/15"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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