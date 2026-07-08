import { Link } from "@tanstack/react-router";
import type { Product } from "../lib/mock-data";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="group animate-vault-up block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-3 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-neutral-200">
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={800}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {product.code} · {product.category}
          </p>
          <h3 className="mt-1 truncate text-base font-extrabold tracking-tight">{product.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{product.tagline}</p>
        </div>
        <span className="shrink-0 rounded-md bg-foreground px-2 py-1 font-mono text-xs font-bold text-background">
          ${product.price}
        </span>
      </div>
    </Link>
  );
}