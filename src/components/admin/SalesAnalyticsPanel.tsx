import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, ShoppingBag, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  total_revenue_usd: number;
  total_revenue_pkr: number;
  total_orders: number;
  pending_orders: number;
  rejected_orders: number;
  orders_today: number;
  orders_7d: number;
  orders_30d: number;
  top_products: { item_name: string; sales: number; revenue: number; currency: string }[];
  daily_30d: { d: string; orders: number; usd: number | null; pkr: number | null }[];
};

export function SalesAnalyticsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_sales_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_sales_stats" as never);
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  if (isLoading) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;
  if (error || !data) return <p className="py-10 text-center text-sm text-destructive">Failed to load stats.</p>;

  const maxOrders = Math.max(1, ...data.daily_30d.map((d) => d.orders));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={DollarSign} label="Revenue (USD)" value={`$${Number(data.total_revenue_usd).toLocaleString()}`} />
        <Stat icon={DollarSign} label="Revenue (PKR)" value={`₨${Number(data.total_revenue_pkr).toLocaleString()}`} />
        <Stat icon={ShoppingBag} label="Approved orders" value={String(data.total_orders)} />
        <Stat icon={Clock} label="Pending" value={String(data.pending_orders)} tone="warn" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={TrendingUp} label="Today" value={String(data.orders_today)} />
        <Stat icon={TrendingUp} label="Last 7d" value={String(data.orders_7d)} />
        <Stat icon={TrendingUp} label="Last 30d" value={String(data.orders_30d)} />
        <Stat icon={XCircle} label="Rejected" value={String(data.rejected_orders)} tone="danger" />
      </div>

      <section className="rounded-2xl border border-border bg-background/50 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">Orders — last 30 days</p>
        <div className="flex h-32 items-end gap-1">
          {data.daily_30d.length === 0 ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            data.daily_30d.map((d) => (
              <div
                key={d.d}
                title={`${d.d}: ${d.orders} orders`}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all hover:opacity-80"
                style={{ height: `${(d.orders / maxOrders) * 100}%`, minHeight: 2 }}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background/50 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">Top products</p>
        {data.top_products.length === 0 ? (
          <p className="text-sm text-muted">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.top_products.map((p, i) => (
              <li key={`${p.item_name}-${p.currency}-${i}`} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-md bg-primary/10 font-mono text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold">{p.item_name}</span>
                </span>
                <span className="font-mono text-xs text-muted">
                  {p.sales} sold · {p.currency === "PKR" ? "₨" : "$"}
                  {Number(p.revenue).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tone?: "warn" | "danger";
}) {
  const toneClass =
    tone === "warn" ? "text-yellow-500" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${toneClass}`} />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className="mt-1 font-display text-xl tracking-tight">{value}</p>
    </div>
  );
}