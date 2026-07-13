import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { categories } from "../lib/mock-data";
import { useProducts } from "../lib/products-store";
import { CommunityBanner } from "../components/CommunityBanner";
import { PostsFeed } from "../components/PostsFeed";

export const Route = createFileRoute("/")({
  component: Discovery,
});

function Discovery() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const { products, loading } = useProducts();

  // Debounce search input so filtering doesn't run on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = q === "" || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q);
      const matchesC = cat === "All" || p.category === cat;
      return matchesQ && matchesC;
    });
  }, [debouncedQuery, cat, products]);

  return (
    <main className="relative mx-auto max-w-2xl px-4 pb-40 pt-10">
      {/* Aurora orbs — floating cosmic light sources */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] overflow-hidden">
        <div className="aurora-orb" style={{ top: "-60px", left: "-40px", width: 260, height: 260, background: "radial-gradient(circle, hsl(268 85% 68% / 0.55), transparent 70%)" }} />
        <div className="aurora-orb" style={{ top: "40px", right: "-60px", width: 320, height: 320, background: "radial-gradient(circle, hsl(190 90% 62% / 0.45), transparent 70%)", animationDelay: "-6s" }} />
        <div className="aurora-orb" style={{ top: "220px", left: "35%", width: 220, height: 220, background: "radial-gradient(circle, hsl(38 95% 62% / 0.35), transparent 70%)", animationDelay: "-11s" }} />
      </div>

      {/* Asymmetric hero */}
      <header className="relative mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 backdrop-blur-md">
          <span className="relative grid size-2 place-items-center">
            <span className="absolute inline-flex size-full rounded-full bg-primary pulse-ring" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
            Premium Subscriptions · Fair Prices
          </span>
        </div>

        <h1 className="font-display text-balance text-5xl leading-[0.95] tracking-tight sm:text-6xl">
          <span className="text-chrome">Premium tools,</span>
          <br />
          <span className="ml-[0.9em] text-aurora">unreal prices.</span>
          <br />
          <span className="text-foreground/90">/ no compromise.</span>
        </h1>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <p className="max-w-md text-sm leading-relaxed text-muted">
            Top-shelf subscriptions — AI, design, and dev tools — bundled at a
            fraction of retail. Same features, smarter price, zero fluff.
          </p>
          <div className="hidden shrink-0 text-right font-mono text-[10px] uppercase tracking-widest text-muted sm:block">
            <div className="text-foreground/80">{products.length.toString().padStart(3, "0")}</div>
            <div>plans live</div>
          </div>
        </div>
      </header>

      <div className="relative mb-10">
        <CommunityBanner />
      </div>

      <PostsFeed />

      {/* Search — glass capsule */}
      <div className="relative mb-6 flex items-center gap-2 aurora-glass rounded-2xl px-4 py-2.5">
        <Search className="size-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query the vault…"
          aria-label="Search the vault"
          className="flex-1 border-none bg-transparent px-1 text-sm outline-none placeholder:text-muted"
        />
        <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted sm:inline">
          ⌘K
        </span>
      </div>

      {/* Category dock — floating nodes */}
      <div className="no-scrollbar mb-10 flex gap-2 overflow-x-auto pb-2">
        {categories.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`group relative shrink-0 overflow-hidden rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                active
                  ? "text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted hover:text-foreground"
              }`}
              style={
                active
                  ? { background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }
                  : undefined
              }
            >
              {!active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-border bg-background/40 backdrop-blur-md transition group-hover:border-foreground/30"
                />
              )}
              <span className="relative">{c === "All" ? "◉ All" : c}</span>
            </button>
          );
        })}
      </div>

      {/* Asymmetric offset product grid */}
      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {loading ? (
          <p className="col-span-full py-16 text-center text-sm text-muted">Uplinking vault…</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-muted">
            No assets match that filter yet.
          </p>
        ) : (
          filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))
        )}
      </section>
    </main>
  );
}
