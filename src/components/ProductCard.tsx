import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Product } from "../lib/mock-data";
import { formatPriceTags } from "../lib/price";
import { useAuth } from "../hooks/use-auth";
import { claimFreeProduct, MY_ORDERS_QUERY_KEY } from "../lib/orders-store";

const PENDING_CLAIM_KEY = "pending-free-claim";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const isFree = !!product.is_free;
  const tags = isFree ? ["FREE"] : formatPriceTags(product);
  const stock = product.available_stock ?? 0;
  const outOfStock = !isFree && stock === 0;
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  async function handleFreeClaim(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      try { localStorage.setItem(PENDING_CLAIM_KEY, product.id); } catch { /* ignore */ }
      toast.info("Sign in to claim this free product");
      navigate({ to: "/auth" });
      return;
    }
    setClaiming(true);
    try {
      const row = await claimFreeProduct(product.id);
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
      className="group animate-vault-up block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-neutral-200">
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={800}
          loading="lazy"
          className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            outOfStock ? "opacity-60" : ""
          }`}
        />
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest ${
            isFree
              ? "bg-emerald-500 text-white"
              : outOfStock
              ? "bg-foreground text-background"
              : stock <= 3
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-foreground"
          }`}
        >
          {isFree
            ? "FREE · unlimited"
            : outOfStock
            ? "Restocking soon"
            : stock <= 3
              ? `Only ${stock} left`
              : `${stock} in stock`}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {product.code} · {product.category}
          </p>
          <h3 className="mt-1 truncate text-base font-extrabold tracking-tight">{product.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{product.tagline}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-foreground px-2 py-1 font-mono text-xs font-bold text-background">
              {t}
            </span>
          ))}
        </div>
      </div>
      {isFree && (
        <button
          type="button"
          onClick={handleFreeClaim}
          disabled={claiming}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-white shadow-sm shadow-emerald-500/20 disabled:opacity-60"
        >
          <Gift className="size-3.5" /> {claiming ? "Claiming…" : "Get it free"}
        </button>
      )}
    </Link>
  );
}