import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Pin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_META, type Post } from "@/components/PostsFeed";
import { SITE_URL, excerpt } from "@/lib/site";

export const Route = createFileRoute("/tips/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw notFound();
    return { post: data as Post };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/tips/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Unavailable — Digital Chacho" }, { name: "robots", content: "noindex" }],
      };
    }
    const post = loaderData.post;
    const title = `${post.title} — Digital Chacho`;
    const description = excerpt(post.body);
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: post.title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (post.image && post.image.startsWith("https://")) {
      meta.push({ property: "og:image", content: post.image });
      meta.push({ name: "twitter:image", content: post.image });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description,
            datePublished: post.created_at,
            dateModified: post.updated_at,
            mainEntityOfPage: url,
            ...(post.image ? { image: post.image } : {}),
            publisher: { "@type": "Organization", name: "Digital Chacho", url: SITE_URL },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Tips & tricks", item: `${SITE_URL}/tips` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: PostPage,
  notFoundComponent: PostMissing,
});

function PostMissing() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-10 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Post not found</h1>
      <p className="mt-2 text-sm text-muted">This tip may have been removed or unpublished.</p>
      <Link
        to="/tips"
        className="mt-6 inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> All tips
      </Link>
    </main>
  );
}

function PostPage() {
  const { post } = Route.useLoaderData();
  const meta = CATEGORY_META[post.category] ?? CATEGORY_META.update;
  const Icon = meta.icon;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 lg:max-w-3xl lg:px-8">
      <Link
        to="/tips"
        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Tips &amp; tricks
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.tone}`}
          >
            <Icon className="size-3" /> {meta.label}
          </span>
          <span className="font-mono text-[10px] text-muted">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
              <Pin className="size-3" /> Pinned
            </span>
          )}
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{post.title}</h1>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            className="mt-5 aspect-[16/9] w-full rounded-2xl border border-border object-cover"
          />
        )}

        <div className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-muted">
          {post.body}
        </div>

        {post.link && (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground"
          >
            Open link <ExternalLink className="size-3" />
          </a>
        )}
      </article>
    </main>
  );
}
