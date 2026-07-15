import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import { Gift, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Product } from "../lib/mock-data";
import { formatPriceTags } from "../lib/price";
import { useAuth } from "../hooks/use-auth";
import { claimFreeProduct, MY_ORDERS_QUERY_KEY } from "../lib/orders-store";
import { WishlistButton } from "./WishlistButton";

const PENDING_CLAIM_KEY = "pending-free-claim";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isFree = !!product.is_free;
  const tags = isFree ? ["FREE"] : formatPriceTags(product);
  const stock = product.available_stock ?? 0;
  const outOfStock = stock === 0;
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  async function handleFreeClaim(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (!user) {
      try { localStorage.setItem(PENDING_CLAIM_KEY, product.id); } catch { /* ignore */ }
      toast.info("Sign in to claim this free product");
      navigate({ to: "/auth" });
      return;
    }
    setClaiming(true);
    try {
      const row = await claimFreeProduct(product.id);
      if (row.out_of_stock) {
        toast.error("Out of stock — please check back soon");
        return;
      }
      toast.success(row.already_owned ? "Already in your purchases" : "Added to your purchases");
      qc.invalidateQueries({ queryKey: MY_ORDERS_QUERY_KEY });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="group animate-vault-up relative block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-[28px] aurora-glass transition-transform duration-500 group-hover:-translate-y-1">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[28px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "conic-gradient(from 140deg at 50% 50%, color-mix(in oklab, var(--primary) 40%, transparent), color-mix(in oklab, var(--primary-glow) 40%, transparent), color-mix(in oklab, var(--accent-amber) 30%, transparent), color-mix(in oklab, var(--primary) 40%, transparent))",
            filter: "blur(18px)",
            zIndex: -1,
          }}
        />
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={800}
          loading="lazy"
          className={`size-full object-cover transition-all duration-700 group-hover:scale-[1.06] ${
            outOfStock ? "opacity-60" : ""
          }`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-90"
        />
        <WishlistButton productId={product.id} />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest backdrop-blur-md ${
            isFree
              ? outOfStock
                ? "bg-foreground text-background"
                : "bg-emerald-500/90 text-white"
              : outOfStock
              ? "bg-foreground text-background"
              : stock <= 3
                ? "bg-primary text-primary-foreground"
                : "bg-background/60 text-foreground border border-border"
          }`}
        >
          {isFree
            ? outOfStock
              ? "Restocking soon"
              : `FREE · ${stock} in stock`
            : outOfStock
            ? "Restocking soon"
            : stock <= 3
              ? `Only ${stock} left`
              : `${stock} in stock`}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {product.code} · {product.category}
          </p>
          <h3 className="font-display mt-1 truncate text-lg tracking-tight">{product.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{product.tagline}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md px-2 py-1 font-mono text-xs font-bold text-primary-foreground"
              style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      {isFree && (
        <button
          type="button"
          onClick={handleFreeClaim}
          disabled={claiming || outOfStock}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-foreground/30 disabled:shadow-none"
        >
          <Gift className="size-3.5" /> {outOfStock ? "Sold out" : claiming ? "Claiming…" : "Get it free"}
        </button>
      )}
      {outOfStock && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate({
              to: "/requests",
              search: { request: product.name } as never,
            });
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary transition-transform hover:-translate-y-0.5"
        >
          <MessageSquarePlus className="size-3.5" /> Request this
        </button>
      )}
    </Link>
  );
}