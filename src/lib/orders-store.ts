import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PaymentMethodKind = Database["public"]["Enums"]["payment_method_kind"];
export type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const PAYMENT_METHODS_QUERY_KEY = ["payment_methods"] as const;
export const ORDERS_QUERY_KEY = ["orders"] as const;
export const MY_ORDERS_QUERY_KEY = ["orders", "mine"] as const;

export const PAYMENT_KIND_LABEL: Record<PaymentMethodKind, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  nayapay: "NayaPay",
  sadapay: "SadaPay",
  bank: "Bank Transfer",
  binance_pay: "Binance Pay",
  crypto: "Crypto Wallet",
  other: "Other",
};

export function usePaymentMethods(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? true;
  return useQuery({
    queryKey: [...PAYMENT_METHODS_QUERY_KEY, { activeOnly }],
    queryFn: async () => {
      let q = supabase.from("payment_methods").select("*").order("sort_order").order("created_at");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });
}

export async function createPaymentMethod(input: {
  kind: PaymentMethodKind;
  label: string;
  currency: "USD" | "PKR";
  account_name?: string | null;
  account_number: string;
  instructions?: string | null;
  sort_order?: number;
  active?: boolean;
}) {
  const { data, error } = await supabase.from("payment_methods").insert(input).select().single();
  if (error) throw error;
  return data as PaymentMethod;
}

export async function updatePaymentMethod(id: string, patch: Partial<PaymentMethod>) {
  const { error } = await supabase.from("payment_methods").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePaymentMethod(id: string) {
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
}

export function useMyOrders() {
  return useQuery({
    queryKey: MY_ORDERS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
}

export async function uploadPaymentProof(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export async function getProofSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function createOrder(input: {
  buyer_id: string;
  item_kind: string;
  item_id: string;
  item_name: string;
  amount: number;
  currency?: string;
  payment_method_id: string;
  payment_method_label: string;
  sender_name: string;
  sender_contact: string;
  transaction_ref?: string | null;
  proof_path?: string | null;
}) {
  const { data, error } = await supabase.from("orders").insert(input).select().single();
  if (error) throw error;
  return data as Order;
}

export async function reviewOrder(
  id: string,
  status: Exclude<OrderStatus, "pending">,
  note?: string,
) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("orders")
    .update({
      status,
      admin_note: note ?? null,
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function approveOrder(id: string, note?: string) {
  const { data, error } = await supabase.rpc("approve_order", {
    _order_id: id,
    _note: note ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { order_id: string; delivered: boolean; out_of_stock: boolean };
}

export function useOrdersInvalidator() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    qc.invalidateQueries({ queryKey: MY_ORDERS_QUERY_KEY });
  };
}