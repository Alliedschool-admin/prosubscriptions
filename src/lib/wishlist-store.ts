import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WishlistRow = { user_id: string; product_id: string; created_at: string };

export const WISHLIST_QUERY_KEY = ["wishlist"] as const;

export function useWishlist() {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("user_id, product_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WishlistRow[];
    },
  });
}

export async function addToWishlist(userId: string, productId: string) {
  const { error } = await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function removeFromWishlist(userId: string, productId: string) {
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw error;
}

export function useWishlistInvalidator() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
}