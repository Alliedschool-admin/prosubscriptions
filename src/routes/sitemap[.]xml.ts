import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

type Entry = {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/tips", changefreq: "daily", priority: "0.9" },
        ];

        const [posts, products] = await Promise.all([
          supabase
            .from("posts")
            .select("slug, updated_at")
            .eq("published", true)
            .order("created_at", { ascending: false }),
          supabase.from("products").select("id, updated_at"),
        ]);

        for (const post of posts.data ?? []) {
          if (!post.slug) continue;
          entries.push({
            path: `/tips/${post.slug}`,
            lastmod: post.updated_at ?? undefined,
            changefreq: "monthly",
            priority: "0.8",
          });
        }

        for (const product of products.data ?? []) {
          entries.push({
            path: `/products/${product.id}`,
            lastmod: product.updated_at ?? undefined,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${xmlEscape(`${SITE_URL}${e.path}`)}</loc>`,
            e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
