import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLoyaltyPoints(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["loyalty_points", userId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
        "loyalty_points",
      )
        .select("points")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return ((data as { points?: number } | null)?.points ?? 0) as number;
    },
  });
}