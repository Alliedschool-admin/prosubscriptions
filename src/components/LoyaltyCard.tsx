import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLoyaltyPoints } from "@/lib/loyalty-store";

export function LoyaltyCard() {
  const { user } = useAuth();
  const { data: points = 0 } = useLoyaltyPoints(user?.id);
  if (!user) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Loyalty points</p>
          <p className="font-display text-2xl leading-none tracking-tight">
            {points.toLocaleString()} <span className="text-sm font-normal text-muted">pts</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">Earn 1 point per $1 spent. Redeemable soon.</p>
    </div>
  );
}