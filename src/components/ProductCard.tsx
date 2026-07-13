import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
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
  const outOfStock = stock === 0;
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  function handleTilt(e: PointerEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -8;
    const ry = (px - 0.5) * 10;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }

  function resetTilt() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }

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
      className="group animate-vault-up relative block [perspective:1200px]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        ref={cardRef}
        onPointerMove={handleTilt}
        onPointerLeave={resetTilt}
        className="shard-card relative min-h-[420px] p-5 pt-14 transition-transform duration-500 will-change-transform group-hover:scale-[1.03] group-hover:shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
        style={{
          transform:
            "perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
        }}
      >
        {/* Fiber-optic dynamic border */}
        <span aria-hidden className="shard-border" />
        {/* Ambient mesh gradient revealed through glass */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(400px 260px at var(--mx,30%) var(--my,20%), color-mix(in oklab, var(--primary-glow) 22%, transparent) 0%, transparent 60%), radial-gradient(500px 320px at 90% 110%, color-mix(in oklab, var(--accent-amber) 14%, transparent) 0%, transparent 65%)",
          }}
        />
        {/* Shimmer energy pulse on hover */}
        <span aria-hidden className="shard-shimmer" />

        {/* Floating metallic HUD badge with product graphic */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative size-24">
            <span
              aria-hidden
              className="hud-orbit absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary-glow) 70%, transparent) 60deg, transparent 120deg, color-mix(in oklab, var(--accent-amber) 60%, transparent) 200deg, transparent 260deg)",
                filter: "blur(6px)",
              }}
            />
            <div
              className="absolute inset-[3px] overflow-hidden rounded-full border border-white/20"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, hsl(220 20% 40%) 0%, hsl(240 20% 8%) 55%, hsl(240 20% 4%) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -8px 20px rgba(0,0,0,0.55), 0 8px 24px -6px color-mix(in oklab, var(--primary) 55%, transparent)",
              }}
            >
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className={`size-full object-cover ${outOfStock ? "opacity-60" : ""}`}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.35) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.4) 100%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Stock console readout */}
        <span
          className={`absolute right-4 top-4 rounded-sm px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md ${
            isFree
              ? outOfStock
                ? "bg-foreground/80 text-background"
                : "bg-emerald-500/90 text-white"
              : outOfStock
              ? "bg-foreground/80 text-background"
              : stock <= 3
                ? "bg-primary/90 text-primary-foreground"
                : "bg-background/50 text-foreground/80 border border-white/10"
          }`}
        >
          {isFree
            ? outOfStock ? "◌ Restock" : `◉ FREE · ${stock}`
            : outOfStock ? "◌ Restock" : stock <= 3 ? `◉ ${stock} LEFT` : `◉ ${stock}`}
        </span>

        {/* Body */}
        <div className="relative z-[1] mt-8 flex h-[calc(100%-4rem)] flex-col">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            <span className="text-primary-glow" style={{ color: "var(--primary-glow)" }}>{"//"}</span> {product.code} · {product.category}
          </p>
          <h3 className="font-display mt-2 line-clamp-2 text-xl leading-tight tracking-tight">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{product.tagline}</p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-sm px-2 py-1 font-mono text-[11px] font-bold tracking-widest text-primary-foreground"
                style={{
                  background:
                    "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)",
                  boxShadow:
                    "0 4px 18px -6px color-mix(in oklab, var(--primary) 60%, transparent)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4">
            {isFree ? (
              <button
                type="button"
                onClick={handleFreeClaim}
                disabled={claiming || outOfStock}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-emerald-500 px-3 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-foreground/30 disabled:shadow-none"
              >
                <Gift className="size-3.5" /> {outOfStock ? "Sold out" : claiming ? "Claiming…" : "Get it free"}
              </button>
            ) : (
              <div className="flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                <span>◄ open dossier</span>
                <span className="text-foreground/80">→</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}