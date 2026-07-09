import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, LayoutDashboard, Sparkles, ShieldCheck } from "lucide-react";

const links = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/pricing", label: "Pricing", icon: Sparkles },
  { to: "/dashboard", label: "Vault", icon: LayoutDashboard },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-foreground">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
            </span>
            <span className="text-lg font-extrabold tracking-tighter">VAULT.01</span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {links.map((l) => {
              const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
              Online
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {links.map((l) => {
            const Icon = l.icon;
            const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-mono uppercase tracking-widest ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <Icon className="size-4" strokeWidth={active ? 2.5 : 1.75} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}