import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StockItem = Database["public"]["Tables"]["product_stock_items"]["Row"];

export const STOCK_QUERY_KEY = ["product_stock_items"] as const;

export function useProductStock(productId: string | null | undefined) {
  return useQuery({
    queryKey: [...STOCK_QUERY_KEY, productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock_items")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StockItem[];
    },
  });
}

export async function addStockItems(productId: string, contents: string[]) {
  const { data: userData } = await supabase.auth.getUser();
  const rows = contents
    .map((c) => c.trim())
    .filter(Boolean)
    .map((content) => ({
      product_id: productId,
      content,
      created_by: userData.user?.id ?? null,
    }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("product_stock_items").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function deleteStockItem(id: string) {
  const { error } = await supabase.from("product_stock_items").delete().eq("id", id);
  if (error) throw error;
}

export function useStockInvalidator() {
  const qc = useQueryClient();
  return (productId?: string) => {
    qc.invalidateQueries({
      queryKey: productId ? [...STOCK_QUERY_KEY, productId] : STOCK_QUERY_KEY,
    });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
}
