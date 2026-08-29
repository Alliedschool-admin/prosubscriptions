import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description: "Full-text search across public product name, tagline, and description.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search text."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const pattern = `%${query.replace(/[%_]/g, "")}%`;
    const { data, error } = await sb
      .from("products")
      .select("id, code, name, tagline, description, category, price")
      .or(`name.ilike.${pattern},tagline.ilike.${pattern},description.ilike.${pattern}`)
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});