import { supabase } from "@/integrations/supabase/client";

export type AppliedCoupon = {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  discount: number;
};

/**
 * Validate a promo code server-side and return the computed discount.
 * Throws with a user-visible message on invalid / expired / etc.
 */
export async function applyCouponRpc(
  code: string,
  subtotal: number,
  currency: string,
): Promise<AppliedCoupon> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: AppliedCoupon[] | null;
      error: { message: string } | null;
    }>
  )("apply_coupon", { _code: code, _subtotal: subtotal, _currency: currency });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, ""));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Invalid code");
  return row;
}

export async function redeemCouponRpc(code: string) {
  try {
    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "redeem_coupon",
      { _code: code },
    );
  } catch { /* best-effort */ }
}