import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getProduct, mockLibrary, mockUser, plans } from "../lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Vault — Vault.01" },
      { name: "description", content: "Your library of purchased tools and active subscription." },
      { property: "og:title", content: "Your Vault" },
      { property: "og:description", content: "Your library of purchased tools and active subscription." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const activePlan = plans.find((p) => p.name === mockUser.plan)!;

  return (
    <main className="mx-auto max-w-2xl pb-32">
      {/* Profile header */}
      <section className="px-4 pt-8">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-foreground font-mono text-sm font-bold text-background">
            {mockUser.initials}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Pro · Member since {mockUser.memberSince}
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{mockUser.name}</h1>
            <p className="truncate text-sm text-muted">{mockUser.handle}</p>
          </div>
        </div>
      </section>

      {/* Subscription widget */}
      <section className="mt-8 px-4">
        <div className="rounded-2xl bg-foreground p-6 text-background">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Subscription · {mockUser.status}
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight">{activePlan.name}</h2>
              <p className="mt-1 text-sm text-background/60">Renews {mockUser.renews}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold">
                ${activePlan.price}
                <span className="text-xs font-normal text-background/60">{activePlan.cadence}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => toast("Manage Subscription", { description: "Simulated portal opened." })}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-background/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-background hover:bg-background/15"
          >
            <Settings2 className="size-3.5" /> Manage subscription
          </button>
        </div>
      </section>

      {/* Library */}
      <section className="mt-10 px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Owned single tools</p>
            <h2 className="text-2xl font-extrabold tracking-tight">MY LIBRARY</h2>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
            {mockLibrary.length} items
          </span>
        </div>

        <ul className="space-y-3">
          {mockLibrary.map((entry) => {
            const product = getProduct(entry.productId);
            if (!product) return null;
            return (
              <li
                key={entry.productId}
                className="flex items-center gap-4 rounded-xl border border-border bg-background p-3"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/products/$id"
                    params={{ id: product.id }}
                    className="truncate text-sm font-bold hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Purchased {entry.purchasedOn} · Last DL {entry.lastDownload}
                  </p>
                </div>
                <button
                  onClick={() => toast.success(`${product.name} download started`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary"
                >
                  <Download className="size-3.5" />
                  Get
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}