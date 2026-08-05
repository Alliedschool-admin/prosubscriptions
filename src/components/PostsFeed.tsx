import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Megaphone, Gift, Pin, ExternalLink, ChevronDown, Lightbulb, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PostCategory = "tip" | "free_method" | "update" | "announcement";

export type Post = {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  link: string | null;
  image: string | null;
  pinned: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export const POSTS_QUERY_KEY = ["posts"] as const;

export const CATEGORY_META: Record<PostCategory, { label: string; icon: typeof Gift; tone: string }> = {
  tip: { label: "Tip & trick", icon: Lightbulb, tone: "text-cyan-400 bg-cyan-400/10" },
  free_method: { label: "Free method", icon: Gift, tone: "text-emerald-500 bg-emerald-500/10" },
  update: { label: "Update", icon: Sparkles, tone: "text-primary bg-primary/10" },
  announcement: { label: "Announcement", icon: Megaphone, tone: "text-amber-500 bg-amber-500/10" },
};

async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await (supabase.from as unknown as (t: string) => {
    select: (c: string) => {
      eq: (a: string, b: boolean) => {
        order: (c: string, o: { ascending: boolean }) => {
          order: (c: string, o: { ascending: boolean }) => Promise<{ data: Post[] | null; error: { message: string } | null }>;
        };
      };
    };
  })("posts")
    .select("*")
    .eq("published", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function usePublishedPosts() {
  return useQuery({ queryKey: POSTS_QUERY_KEY, queryFn: fetchPosts });
}

export function PostCard({ post: p }: { post: Post }) {
  const meta = CATEGORY_META[p.category] ?? CATEGORY_META.update;
  const Icon = meta.icon;
  return (
    <li className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      {p.image && (
        <img
          src={p.image}
          alt=""
          loading="lazy"
          className="mb-3 aspect-[16/9] w-full rounded-lg object-cover"
        />
      )}
      {p.pinned && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
          <Pin className="size-3" /> Pinned
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.tone}`}>
          <Icon className="size-3" /> {meta.label}
        </span>
        <span className="font-mono text-[10px] text-muted">
          {new Date(p.created_at).toLocaleDateString()}
        </span>
      </div>
      <h3 className="mt-2 text-base font-bold tracking-tight">{p.title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{p.body}</p>
      {p.link && (
        <a
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
        >
          Open link <ExternalLink className="size-3" />
        </a>
      )}
    </li>
  );
}

export function PostsFeed({ mobilePreview = false }: { mobilePreview?: boolean } = {}) {
  const { data: posts = [], isLoading, error } = usePublishedPosts();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;
  if (error) return null;
  if (posts.length === 0) return null;

  const showAll = expanded || !mobilePreview;
  const visible = showAll ? posts : posts.slice(0, 1);

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold tracking-tight">Tips, tricks & updates</h2>
        <Link
          to="/tips"
          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted hover:text-foreground"
        >
          See all {posts.length} <ArrowRight className="size-3" />
        </Link>
      </div>
      <ul className="space-y-3">
        {visible.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </ul>
      {mobilePreview && !expanded && posts.length > 1 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-background/40 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted backdrop-blur-md hover:text-foreground sm:hidden"
        >
          See all {posts.length} updates <ChevronDown className="size-3" />
        </button>
      )}
    </section>
  );
}