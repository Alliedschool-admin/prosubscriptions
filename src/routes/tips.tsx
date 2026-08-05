import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lightbulb, Search, ArrowLeft } from "lucide-react";
import {
  usePublishedPosts,
  PostCard,
  CATEGORY_META,
  postsQueryOptions,
  type PostCategory,
} from "../components/PostsFeed";
import { SITE_URL } from "../lib/site";

const CATS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tip", label: "Tips & tricks" },
  { id: "free_method", label: "Free methods" },
  { id: "update", label: "Updates" },
  { id: "announcement", label: "Announcements" },
];

const TITLE = "Tech tips & tricks — Digital Chacho";
const DESC =
  "Free methods, tech tips and tricks, and the latest store updates from Digital Chacho.";

export const Route = createFileRoute("/tips")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQueryOptions),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/tips` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/tips` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Tech tips & tricks",
          description: DESC,
          url: `${SITE_URL}/tips`,
        }),
      },
    ],
  }),
  component: TipsPage,
});

function TipsPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const { data: posts = [], isLoading, error } = usePublishedPosts();

  const query = q.slice(0, 100).trim().toLowerCase();
  const activeCat = CATS.some((c) => c.id === cat) ? cat : "all";

  const filtered = posts.filter((p) => {
    const catOk = activeCat === "all" || p.category === (activeCat as PostCategory);
    const qOk =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.body.toLowerCase().includes(query);
    return catOk && qOk;
  });

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 lg:max-w-4xl lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to store
      </Link>

      <header className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          <Lightbulb className="size-3" /> Knowledge base
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Tech tips &amp; tricks
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{DESC}</p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATS.map((c) => {
          const on = c.id === activeCat;
          const count =
            c.id === "all"
              ? posts.length
              : posts.filter((p) => p.category === (c.id as PostCategory)).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
setCat(c.id)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition ${
                on
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {c.label} <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) =>
setQ(e.target.value)}
          placeholder="Search tips, methods, updates…"
          className="input w-full pl-9"
        />
      </div>

      <div className="mt-6">
        {error && (
          <p className="text-sm text-muted">Couldn&apos;t load posts. Try again shortly.</p>
        )}
        {!error && filtered.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
            Nothing here yet
            {activeCat !== "all"
              ? ` under ${CATEGORY_META[activeCat as PostCategory]?.label ?? activeCat}`
              : ""}
            . Check back soon.
          </p>
        )}
        <ul className="space-y-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </ul>
      </div>
    </main>
  );
}
