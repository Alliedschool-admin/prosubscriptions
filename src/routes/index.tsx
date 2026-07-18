import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Clock, Sparkles, Zap, ShieldCheck, Rocket, Infinity as InfinityIcon, Diamond } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { categories } from "../lib/mock-data";
import { useProducts } from "../lib/products-store";
import { CommunityBanner, CommunityPill } from "../components/CommunityBanner";
import { PostsFeed } from "../components/PostsFeed";
import { getRecentlyViewed } from "../lib/recently-viewed";
import { CountUp } from "../components/CountUp";
import { trackSpotlight } from "../lib/spotlight";
import { useSiteSetting } from "../lib/site-settings";

type HeroSettings = {
  image_url?: string;
  headline?: string;
  subtext?: string;
  cta_label?: string;
  cta_href?: string;
};

export const Route = createFileRoute("/")({
  component: Discovery,
});

function Discovery() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const { products, loading } = useProducts();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { value: hero } = useSiteSetting<HeroSettings>("hero");
  const heroImage = hero?.image_url;

  useEffect(() => {
    setRecentIds(getRecentlyViewed());
  }, []);

  const recent = useMemo(
    () =>
      recentIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .slice(0, 6),
    [recentIds, products],
  );

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
    <main className="relative mx-auto max-w-2xl px-4 pb-40 pt-10 lg:max-w-6xl lg:px-8 lg:pt-16">
      {/* Desktop-only grid backdrop — spatial architecture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[780px] grid-backdrop lg:block"
      />
      {/* Aurora orbs — floating cosmic light sources */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] overflow-hidden lg:h-[680px]">
        <div className="aurora-orb" style={{ top: "-60px", left: "-40px", width: 260, height: 260, background: "radial-gradient(circle, hsl(268 85% 68% / 0.55), transparent 70%)" }} />
        <div className="aurora-orb" style={{ top: "40px", right: "-60px", width: 320, height: 320, background: "radial-gradient(circle, hsl(190 90% 62% / 0.45), transparent 70%)", animationDelay: "-6s" }} />
        <div className="aurora-orb" style={{ top: "220px", left: "35%", width: 220, height: 220, background: "radial-gradient(circle, hsl(38 95% 62% / 0.35), transparent 70%)", animationDelay: "-11s" }} />
      </div>

      {/* Asymmetric hero */}
      <header className={`relative mb-10 lg:mb-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-8 ${heroImage ? "overflow-hidden rounded-3xl border border-border/60" : ""}`}>
        {heroImage && (
          <>
            <img
              src={heroImage}
              alt=""
              aria-hidden
              fetchPriority="high"
              className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-background/85 via-background/70 to-background/40"
            />
          </>
        )}
        <div className="lg:col-span-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 backdrop-blur-md">
          <span className="relative grid size-2 place-items-center">
            <span className="absolute inline-flex size-full rounded-full bg-primary pulse-ring" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
            Premium Subscriptions · Fair Prices
          </span>
        </div>

        {hero?.headline ? (
          <h1 className="font-display text-balance leading-[0.95] tracking-tight text-[clamp(1.9rem,9vw,4rem)] sm:text-6xl lg:text-5xl xl:text-6xl">
            <span className="text-chrome">{hero.headline}</span>
          </h1>
        ) : (
          <h1 className="font-display text-balance leading-[0.95] tracking-tight text-[clamp(1.9rem,9vw,4rem)] sm:text-6xl lg:text-5xl xl:text-6xl">
            <span className="text-chrome">Premium tools.</span>
            <br />
            <span className="text-aurora sm:ml-[0.9em]">Unreal prices.</span>
            <span className="hidden sm:inline"><br /><span className="text-foreground/90">/ no compromise.</span></span>
          </h1>
        )}

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 sm:mt-6 lg:mt-8">
          <p className="max-w-md text-sm leading-relaxed text-muted lg:text-base">
            {hero?.subtext ? (
              hero.subtext
            ) : (
              <>
                <span className="sm:hidden">Top-shelf subscriptions at a fraction of retail.</span>
                <span className="hidden sm:inline">Top-shelf subscriptions — AI, design, and dev tools — bundled at a fraction of retail. Same features, smarter price, zero fluff.</span>
              </>
            )}
          </p>
          <div className="hidden shrink-0 text-right font-mono text-[10px] uppercase tracking-widest text-muted sm:block">
            <div className="text-foreground/80">{products.length.toString().padStart(3, "0")}</div>
            <div>plans live</div>
          </div>
        </div>

        {/* Desktop-only CTA row */}
        <div className="mt-8 hidden items-center gap-3 lg:flex">
          <a
            href={hero?.cta_href || "#vault"}
            className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
          >
            <Zap className="size-3.5" /> {hero?.cta_label || "Enter the vault"}
          </a>
          <a
            href="#posts"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] text-foreground backdrop-blur-md transition-colors hover:border-primary/60 hover:text-primary"
          >
            <Sparkles className="size-3.5" /> Free methods
          </a>
        </div>
        </div>
        {/* Desktop stat panel — creative flourish */}
        <aside className="mt-8 hidden lg:col-span-4 lg:mt-0 lg:block">
          <div
            className="spotlight aurora-glass relative overflow-hidden rounded-3xl p-6 reveal"
            onPointerMove={trackSpotlight}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 60%, transparent), transparent 70%)" }}
            />
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                <span className="relative grid size-1.5 place-items-center">
                  <span className="absolute inline-flex size-full rounded-full bg-emerald-400 pulse-ring" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                v.03 · Vault
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <CountUp to={products.length} className="font-display text-7xl tracking-tight text-aurora" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">live plans</span>
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <ul className="mt-4 space-y-2.5 font-mono text-[11px] uppercase tracking-widest text-muted">
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><Rocket className="size-3 text-primary" /> Instant delivery</span>
                <span className="text-foreground/80">24/7</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3 text-primary" /> Verified stock</span>
                <span className="text-foreground/80">Live</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><Diamond className="size-3 text-primary" /> Fair pricing</span>
                <span className="text-foreground/80">Always</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><InfinityIcon className="size-3 text-primary" /> Support</span>
                <span className="text-foreground/80">Human</span>
              </li>
            </ul>
          </div>
        </aside>
      </header>

      {/* Desktop marquee — trust ticker */}
      <div className="reveal relative mb-10 hidden overflow-hidden rounded-2xl border border-border/60 bg-background/30 py-3 backdrop-blur-md lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent"
        />
        <div className="flex w-max animate-marquee gap-10 pr-10 font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex shrink-0 items-center gap-10">
              <span className="inline-flex items-center gap-2"><Zap className="size-3 text-primary" /> Instant activation</span>
              <span className="text-foreground/30">◇</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3 text-primary" /> Buyer protected</span>
              <span className="text-foreground/30">◇</span>
              <span className="inline-flex items-center gap-2"><Rocket className="size-3 text-primary" /> Live restocks</span>
              <span className="text-foreground/30">◇</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="size-3 text-primary" /> Free bonus drops</span>
              <span className="text-foreground/30">◇</span>
              <span className="inline-flex items-center gap-2"><Diamond className="size-3 text-primary" /> Fair, honest pricing</span>
              <span className="text-foreground/30">◇</span>
              <span className="inline-flex items-center gap-2"><InfinityIcon className="size-3 text-primary" /> Human support</span>
              <span className="text-foreground/30">◇</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: slim community pill; Desktop/tablet: full banner (below products) */}
      <CommunityPill />

      {/* Search — glass capsule */}
      <div className="relative mb-4 flex items-center gap-2 aurora-glass rounded-2xl px-4 py-2.5 lg:py-3.5">
        <Search className="size-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query the vault…"
          aria-label="Search the vault"
          className="flex-1 border-none bg-transparent px-1 text-sm outline-none placeholder:text-muted lg:text-base"
        />
        <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted sm:inline">
          ⌘K
        </span>
      </div>

      {/* Category dock */}
      <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-2">
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
              <span className="relative">{c === "All" ? "All" : c}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop section label */}
      <div id="vault" className="reveal mb-6 hidden items-end justify-between lg:flex">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-primary">
            ◉ Vault · Live inventory
          </p>
          <h2 className="font-display mt-1 text-2xl tracking-tight">
            {filtered.length} {filtered.length === 1 ? "asset" : "assets"}
            <span className="text-muted"> matching your filter</span>
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
          {cat === "All" ? "All categories" : `Category · ${cat}`}
        </span>
      </div>

      {/* Products — surfaced above secondary content on mobile */}
      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-10">
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

      {recent.length > 0 && (
        <section className="reveal mt-12 mb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
              <Clock className="mr-1 inline size-3" /> Recently viewed
            </p>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 lg:gap-4">
            {recent.map((p) => (
              <Link
                key={p.id}
                to="/products/$id"
                params={{ id: p.id }}
                className="group w-36 shrink-0 lg:w-44"
              >
                <div className="aspect-square overflow-hidden rounded-xl border border-border">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 truncate text-xs font-bold">{p.name}</p>
                <p className="font-mono text-[10px] text-muted">{p.code}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div id="posts" className="reveal mt-12">
        <PostsFeed mobilePreview />
      </div>

      {/* Full community banner on tablet+; hidden on mobile (pill above) */}
      <div className="reveal mt-10 hidden sm:block">
        <CommunityBanner />
      </div>
    </main>
  );
}
