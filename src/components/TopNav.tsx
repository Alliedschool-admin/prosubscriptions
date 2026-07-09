import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, LayoutDashboard, Sparkles, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

const baseLinks = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/pricing", label: "Pricing", icon: Sparkles },
  { to: "/dashboard", label: "Vault", icon: LayoutDashboard },
] as const;

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, signOut } = useAuth();
  const links = isAdmin
    ? [...baseLinks, { to: "/admin", label: "Admin", icon: ShieldCheck } as const]
    : baseLinks;
  const cols = links.length;
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
            {session ? (
              <button
                onClick={() => signOut()}
                className="ml-1 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:text-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            ) : (
              <Link
                to="/auth"
                className="ml-1 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
              >
                <LogIn className="size-4" /> Sign in
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            {session ? (
              <button
                onClick={() => signOut()}
                aria-label="Sign out"
                className="rounded-md p-1.5 text-muted"
              >
                <LogOut className="size-4" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="rounded-md bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl sm:hidden">
        <div
          className="mx-auto grid max-w-2xl"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
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