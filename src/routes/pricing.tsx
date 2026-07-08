import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { plans } from "../lib/mock-data";
import { useCart } from "../lib/cart-context";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Vault.01" },
      { name: "description", content: "Compare Starter, Monthly Pro, and Annual Pro plans. Unlock the entire Vault." },
      { property: "og:title", content: "Vault.01 Pricing" },
      { property: "og:description", content: "Compare Starter, Monthly Pro, and Annual Pro plans." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const { openWith } = useCart();
  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-10">
      <header className="mb-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Access · Tiers</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-none tracking-tight">Vault Access.</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Pay once for a single tool, or unlock the entire library with Pro. Cancel anytime.
        </p>
      </header>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative overflow-hidden rounded-2xl border bg-background p-6 ${
              plan.bestValue ? "border-2 border-primary shadow-xl shadow-primary/10" : "border-border"
            }`}
          >
            {plan.bestValue && (
              <div className="absolute right-0 top-0 bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                Best Value
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{plan.code}</p>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight">{plan.name}</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">
                  ${plan.price}
                  <span className="ml-1 text-sm font-normal text-muted">{plan.cadence}</span>
                </div>
                {plan.id === "annual" && (
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                    ≈ $14.92/mo · save $49
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{plan.tagline}</p>

            <ul className="mt-5 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-primary" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled={plan.id === "free"}
              onClick={() =>
                openWith({
                  kind: "plan",
                  id: plan.id,
                  name: `${plan.name} Subscription`,
                  subtitle: `Billed ${plan.cadence === "/mo" ? "monthly" : "annually"}`,
                  price: plan.price,
                  cadence: plan.cadence,
                })
              }
              className={`mt-6 w-full rounded-xl py-3 text-sm font-bold uppercase tracking-widest ${
                plan.id === "free"
                  ? "cursor-default border border-foreground text-foreground"
                  : plan.bestValue
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-foreground text-background"
              }`}
            >
              {plan.id === "free" ? "Current plan" : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        All plans include commercial license · No hidden fees
      </p>
    </main>
  );
}