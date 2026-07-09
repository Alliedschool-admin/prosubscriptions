import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { categories } from "../lib/mock-data";
import { useProducts } from "../lib/products-store";

export const Route = createFileRoute("/")({
  component: Discovery,
});

function Discovery() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const { products, loading } = useProducts();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQ = query.trim() === "" || p.name.toLowerCase().includes(query.toLowerCase()) || p.tagline.toLowerCase().includes(query.toLowerCase());
      const matchesC = cat === "All" || p.category === cat;
      return matchesQ && matchesC;
    });
  }, [query, cat, products]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          System Status · Active
        </p>
        <h1 className="mt-2 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Professional grade
          <br />
          digital assets.
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          A curated vault of presets, UI kits, AI tooling and dev templates — engineered for
          builders who ship.
        </p>
      </header>

      <div className="mb-6 flex items-center rounded-xl border border-border bg-background px-3 py-2">
        <Search className="size-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the vault…"
          className="flex-1 border-none bg-transparent px-3 text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                cat === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {c === "All" ? "All Assets" : c}
            </button>
          ))}
      </div>

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {loading ? (
            <p className="col-span-full py-16 text-center text-sm text-muted">Loading vault…</p>
          ) : filtered.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm text-muted">
              No assets match that filter yet.
            </p>
          ) : (
            filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
          )}
      </section>
    </main>
  );
}
