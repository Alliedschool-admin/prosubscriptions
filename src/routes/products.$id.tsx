import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Check, Download, Gift } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct as getSeedProduct } from "../lib/mock-data";
import { useProducts } from "../lib/products-store";
import { useCart } from "../lib/cart-context";
import { availableCurrencies, formatMoney, productPrice } from "../lib/price";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { MY_ORDERS_QUERY_KEY } from "../lib/orders-store";

export const Route = createFileRoute("/products/$id")({
  head: ({ params }) => {
    const product = getSeedProduct(params.id);
    if (!product) {
      return { meta: [{ title: "Product · Pro Subscriptions" }] };
    }
    const title = `${product.name} — Pro Subscriptions`;
    return {
      meta: [
        { title },
        { name: "description", content: product.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: product.tagline },
        { property: "og:image", content: product.image },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { getProduct, products, loading } = useProducts();
  const { openWith } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const product = getProduct(id);
  const currencies = product ? availableCurrencies(product) : [];
  const usd = product ? productPrice(product, "USD") : null;
  const pkr = product ? productPrice(product, "PKR") : null;
  const isFree = !!product?.is_free;
  const stock = product?.available_stock ?? 0;
  const outOfStock = !isFree && stock === 0;

  async function claimFree() {
    if (!product) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setClaiming(true);
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: { order_id: string; already_owned: boolean }[] | null; error: { message: string } | null }>
      )("claim_free_product", { _product_id: product.id });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(row?.already_owned ? "Already in your purchases" : "Added to your purchases");
      qc.invalidateQueries({ queryKey: MY_ORDERS_QUERY_KEY });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setClaiming(false);
    }
  }

  if (loading && !product) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-muted">
        Loading…
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Asset not found</h1>
        <p className="mt-2 text-sm text-muted">This item may have been removed from the vault.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
        >
          <ChevronLeft className="size-3" /> Back to store
        </Link>
      </main>
    );
  }

  const related = products.filter((p) => p.id !== product.id).slice(0, 2);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted"
      >
        <ChevronLeft className="size-3" /> Back to store
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-neutral-200">
        <img
          src={product.image}
          alt={product.name}
          width={1024}
          height={1024}
          className="aspect-square w-full object-cover"
        />
      </div>

      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
            {product.code} · {product.category}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">{product.tagline}</p>
          <div className="mt-2">
            {isFree ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Free · unlimited access
              </span>
            ) : (
              <StockBadge stock={stock} />
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isFree ? (
            <span className="rounded-md bg-emerald-500 px-3 py-1.5 font-mono text-sm font-bold text-white">FREE</span>
          ) : currencies.map((c) => (
            <span key={c} className="rounded-md bg-foreground px-3 py-1.5 font-mono text-sm font-bold text-background">
              {formatMoney(c, productPrice(product, c) ?? Number(product.price))}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-6 text-pretty text-[15px] leading-relaxed text-foreground/80">
        {product.description}
      </p>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
          What&apos;s inside
        </h2>
        <ul className="space-y-2">
          {product.features.map((f: string) => (
            <li key={f} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
          Screenshots
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative aspect-[4/3] w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-neutral-200"
            >
              <img
                src={product.image}
                alt={`${product.name} screenshot ${i + 1}`}
                loading="lazy"
                className="size-full object-cover"
                style={{ objectPosition: `${i * 40}% ${i * 20}%` }}
              />
              <span className="absolute bottom-2 left-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/90 mix-blend-difference">
                {product.code}-{String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
          Also in the vault
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {related.map((r) => (
            <Link
              key={r.id}
              to="/products/$id"
              params={{ id: r.id }}
              className="block overflow-hidden rounded-xl border border-border"
            >
              <img src={r.image} alt={r.name} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-xs font-bold">{r.name}</p>
                <p className="font-mono text-[10px] text-muted">
                  {availableCurrencies(r)
                    .map((c) => formatMoney(c, productPrice(r, c) ?? Number(r.price)))
                    .join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sticky Buy Bar */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-background/90 p-4 backdrop-blur-xl sm:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="leading-none">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{isFree ? "Price" : "From"}</span>
            <div className="text-xl font-extrabold">
              {isFree ? "FREE" : currencies
                .map((c) => formatMoney(c, productPrice(product, c) ?? Number(product.price)))
                .join(" · ") || "—"}
            </div>
          </div>
          {isFree ? (
            <button
              disabled={claiming}
              onClick={claimFree}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 disabled:opacity-60"
            >
              <Gift className="size-4" /> {claiming ? "Claiming…" : "Get it free"}
            </button>
          ) : (
          <button
            disabled={outOfStock}
            onClick={() =>
              openWith({
                kind: "product",
                id: product.id,
                name: product.name,
                subtitle: `${product.category} · ${product.code}`,
                price_usd: usd,
                price_pkr: pkr,
                available_stock: stock,
              })
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:bg-foreground/30 disabled:shadow-none"
          >
            <Download className="size-4" /> {outOfStock ? "Sold out — restocking" : "Buy Now"}
          </button>
          )}
        </div>
      </div>
    </main>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
        Restocking soon — check back in a few hours
      </span>
    );
  }
  if (stock <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
        Only {stock} left in stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
      {stock} in stock · instant delivery
    </span>
  );
}