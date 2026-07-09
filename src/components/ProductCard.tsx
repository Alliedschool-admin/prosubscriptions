import { Link } from "@tanstack/react-router";
import type { Product } from "../lib/mock-data";
import { formatPriceTags } from "../lib/price";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const tags = formatPriceTags(product);
  const stock = product.available_stock ?? 0;
  const outOfStock = stock === 0;
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
            outOfStock
              ? "bg-foreground text-background"
              : stock <= 3
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-foreground"
          }`}
        >
          {outOfStock
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
    </Link>
  );
}