import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Broadcast = {
  id: string;
  message: string;
  kind: string;
  active: boolean;
  created_at: string;
};

export const BROADCASTS_KEY = ["broadcasts"] as const;

export function useBroadcasts(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? true;
  return useQuery({
    queryKey: [...BROADCASTS_KEY, { activeOnly }],
    queryFn: async () => {
      let q = (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Broadcast[];
    },
  });
}

export async function createBroadcast(message: string, kind: string = "info") {
  const { error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
    "broadcasts",
  ).insert({ message, kind });
  if (error) throw error;
}

export async function setBroadcastActive(id: string, active: boolean) {
  const { error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
    "broadcasts",
  )
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBroadcast(id: string) {
  const { error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
    "broadcasts",
  )
    .delete()
    .eq("id", id);
  if (error) throw error;
}