import type { Product } from "./mock-data";

export type Currency = "USD" | "PKR";

export function formatMoney(currency: Currency, amount: number): string {
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  // PKR: no decimals, thousands separator
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function productPrice(p: Product, currency: Currency): number | null {
  const v = currency === "USD" ? p.price_usd : p.price_pkr;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function availableCurrencies(p: Product): Currency[] {
  const cs: Currency[] = [];
  if (productPrice(p, "USD") != null) cs.push("USD");
  if (productPrice(p, "PKR") != null) cs.push("PKR");
  // legacy fallback: if neither, use `price` as USD
  if (cs.length === 0 && Number(p.price) > 0) cs.push("USD");
  return cs;
}

export function formatPriceTags(p: Product): string[] {
  const cs = availableCurrencies(p);
  return cs.map((c) => {
    const v = productPrice(p, c) ?? Number(p.price);
    return formatMoney(c, v);
  });
}
