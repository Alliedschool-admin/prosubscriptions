import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function anonClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List public products in the Digital Chacho catalog. Optionally filter by category and limit results.",
  inputSchema: {
    category: z
      .enum(["Presets", "UI Kits", "AI Tools", "Dev Templates"])
      .optional()
      .describe("Optional category filter."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }) => {
    const sb = anonClient();
    let q = sb
      .from("products")
      .select("id, code, name, tagline, description, price, price_usd, price_pkr, category, features, is_free")
      .order("name", { ascending: true })
      .limit(limit ?? 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});