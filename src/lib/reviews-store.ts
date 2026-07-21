import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export const REVIEWS_KEY = (productId: string) => ["reviews", productId] as const;

export function useReviews(productId: string) {
  return useQuery({
    queryKey: REVIEWS_KEY(productId),
    queryFn: async () => {
      const { data, error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
        "product_reviews",
      )
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });
}

export async function upsertReview(input: {
  product_id: string;
  user_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}) {
  const { error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
    "product_reviews",
  ).upsert(input, { onConflict: "product_id,user_id" });
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
    "product_reviews",
  )
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function useReviewsInvalidator() {
  const qc = useQueryClient();
  return (productId: string) => qc.invalidateQueries({ queryKey: REVIEWS_KEY(productId) });
}