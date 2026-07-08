import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Check, Download } from "lucide-react";
import { getProduct, products } from "../lib/mock-data";
import { useCart } from "../lib/cart-context";

export const Route = createFileRoute("/products/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product not found · Vault.01" }, { name: "robots", content: "noindex" }] };
    }
    const { product } = loaderData;
    const title = `${product.name} — Vault.01`;
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
  const { product } = Route.useLoaderData();
  const { openWith } = useCart();

  const related = products.filter((p) => p.id !== product.id).slice(0, 2);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-40 pt-6">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted"
      >
        <ChevronLeft className="size-3" /> Back to Vault
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
        </div>
        <span className="shrink-0 rounded-md bg-foreground px-3 py-1.5 font-mono text-sm font-bold text-background">
          ${product.price}
        </span>
      </div>

      <p className="mt-6 text-pretty text-[15px] leading-relaxed text-foreground/80">
        {product.description}
      </p>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
          What&apos;s inside
        </h2>
        <ul className="space-y-2">
          {product.features.map((f) => (
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
                <p className="font-mono text-[10px] text-muted">${r.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sticky Buy Bar */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-background/90 p-4 backdrop-blur-xl sm:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="leading-none">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Total</span>
            <div className="text-xl font-extrabold">${product.price.toFixed(2)}</div>
          </div>
          <button
            onClick={() =>
              openWith({
                kind: "product",
                id: product.id,
                name: product.name,
                subtitle: `${product.category} · ${product.code}`,
                price: product.price,
              })
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Download className="size-4" /> Buy Now
          </button>
        </div>
      </div>
    </main>
  );
}