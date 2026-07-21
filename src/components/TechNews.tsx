import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, Flame } from "lucide-react";

type Story = {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
};

async function fetchTopTech(): Promise<Story[]> {
  // Single request via Algolia HN Search — much faster than 30 firebase item calls.
  const res = await fetch(
    "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12",
  ).then((r) => r.json());
  const hits: any[] = res?.hits ?? [];
  return hits
    .filter((h) => h.title && h.url)
    .map((h) => ({
      id: Number(h.objectID),
      title: h.title,
      url: h.url,
      score: h.points ?? 0,
      by: h.author ?? "",
      time: h.created_at_i ?? Math.floor(Date.now() / 1000),
      descendants: h.num_comments ?? 0,
    }))
    .slice(0, 8);
}

function timeAgo(unix: number) {
  const s = Math.floor(Date.now() / 1000 - unix);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function TechNews() {
  const { data, isLoading } = useQuery({
    queryKey: ["tech-news"],
    queryFn: fetchTopTech,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Newspaper className="size-3" /> Live · auto-updates
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Latest Tech News</h2>
          <p className="mt-1 text-xs text-muted">Top stories from the tech world, refreshed every 15 minutes.</p>
        </div>
        <span className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary sm:inline-flex">
          <Flame className="size-3" /> Hot
        </span>
      </div>

      {isLoading ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-xl border border-border bg-foreground/5" />
          ))}
        </ul>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Couldn't load news right now — try again later.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((s, idx) => {
            const host = (() => {
              try { return new URL(s.url!).hostname.replace(/^www\./, ""); } catch { return ""; }
            })();
            return (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full items-start gap-3 rounded-xl border border-border bg-background/60 p-4 backdrop-blur transition hover:border-primary/40 hover:bg-primary/[0.04]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary">
                      {s.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                      <span className="truncate">{host}</span>
                      <span>·</span>
                      <span>▲ {s.score}</span>
                      <span>·</span>
                      <span>{timeAgo(s.time)}</span>
                    </p>
                  </div>
                  <ExternalLink className="mt-1 size-3.5 shrink-0 text-muted transition group-hover:text-primary" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}