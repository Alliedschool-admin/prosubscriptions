import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProductRequest = Database["public"]["Tables"]["product_requests"]["Row"];
export type ProductRequestStatus = Database["public"]["Enums"]["product_request_status"];

export const REQUESTS_QUERY_KEY = ["product_requests"] as const;
export const MY_REQUESTS_QUERY_KEY = ["product_requests", "mine"] as const;

export const REQUEST_STATUS_LABEL: Record<ProductRequestStatus, string> = {
  new: "New",
  in_review: "In review",
  responded: "Responded",
  fulfilled: "Fulfilled",
  declined: "Declined",
};

export function useMyRequests() {
  return useQuery({
    queryKey: MY_REQUESTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRequest[];
    },
  });
}

export function useAllRequests() {
  return useQuery({
    queryKey: REQUESTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRequest[];
    },
  });
}

export async function createRequest(input: {
  user_id: string;
  product_name: string;
  details?: string | null;
  reference_link?: string | null;
  contact?: string | null;
}) {
  const { data, error } = await supabase
    .from("product_requests")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as ProductRequest;
}

export async function respondToRequest(
  id: string,
  input: { admin_response: string; status: ProductRequestStatus },
) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("product_requests")
    .update({
      admin_response: input.admin_response,
      status: input.status,
      responded_by: userData.user?.id ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRequest(id: string) {
  const { error } = await supabase.from("product_requests").delete().eq("id", id);
  if (error) throw error;
}

export function useRequestsInvalidator() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: REQUESTS_QUERY_KEY });
    qc.invalidateQueries({ queryKey: MY_REQUESTS_QUERY_KEY });
  };
}