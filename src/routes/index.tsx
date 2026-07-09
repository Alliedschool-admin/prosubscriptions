import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { categories, plans } from "../lib/mock-data";
import { useProducts } from "../lib/products-store";
import { useCart } from "../lib/cart-context";

export const Route = createFileRoute("/")({
  component: Discovery,
});

function Discovery() {
  const [mode, setMode] = useState<"single" | "sub">("single");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const { openWith } = useCart();
  const { products } = useProducts();

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

      <div className="mb-6 inline-flex w-full max-w-sm rounded-xl bg-foreground/5 p-1">
        <button
          onClick={() => setMode("single")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
            mode === "single" ? "bg-background shadow-sm" : "text-muted"
          }`}
        >
          Single Tools
        </button>
        <button
          onClick={() => setMode("sub")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
            mode === "sub" ? "bg-background shadow-sm" : "text-muted"
          }`}
        >
          Pro Subscription
        </button>
      </div>

      {mode === "single" && (
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
      )}

      {mode === "single" ? (
        <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm text-muted">
              No assets match that filter yet.
            </p>
          ) : (
            filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-2xl border bg-background p-6 ${
                plan.bestValue ? "border-2 border-primary" : "border-border"
              }`}
            >
              {plan.bestValue && (
                <div className="absolute right-0 top-0 bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Best Value
                </div>
              )}
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{plan.code}</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              <div className="mt-4 text-3xl font-extrabold">
                ${plan.price}
                <span className="ml-1 text-sm font-normal text-muted">{plan.cadence}</span>
              </div>
              <button
                onClick={() =>
                  plan.id === "free"
                    ? undefined
                    : openWith({
                        kind: "plan",
                        id: plan.id,
                        name: `${plan.name} Subscription`,
                        subtitle: `Billed ${plan.cadence === "/mo" ? "monthly" : "annually"}`,
                        price: plan.price,
                        cadence: plan.cadence,
                      })
                }
                className={`mt-6 w-full rounded-xl py-3 text-sm font-bold ${
                  plan.id === "free"
                    ? "border border-foreground text-foreground"
                    : plan.bestValue
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-foreground text-background"
                }`}
              >
                {plan.id === "free" ? "Current Plan" : `Get ${plan.name}`}
              </button>
            </div>
          ))}
          <Link
            to="/pricing"
            className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
          >
            Compare tiers <ArrowUpRight className="size-3" />
          </Link>
        </section>
      )}
    </main>
  );
}
