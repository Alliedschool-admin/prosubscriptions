import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, LayoutDashboard, ShieldCheck, LogIn, LogOut, Sun, Moon, Monitor, Languages } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useI18n, LANG_META, type Lang } from "../lib/i18n";
import { useTheme, type ThemeChoice } from "../lib/theme";
import { useEffect, useRef, useState } from "react";

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const baseLinks = [
    { to: "/", label: t("nav.discover"), icon: Compass },
    { to: "/dashboard", label: t("nav.library"), icon: LayoutDashboard },
  ] as const;
  const links = isAdmin
    ? [...baseLinks, { to: "/admin", label: t("nav.admin"), icon: ShieldCheck } as const]
    : baseLinks;
  const cols = links.length;
  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="relative grid size-7 place-items-center rounded-full"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
            >
              <span className="absolute inset-0 rounded-full pulse-ring" />
              <span className="relative size-2 rounded-full bg-background" />
            </span>
            <span className="font-display text-base tracking-tight sm:text-lg">
              <span className="text-chrome">PRO</span>
              <span className="text-foreground/80"> · SUBSCRIPTIONS</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            {links.map((l) => {
              const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-foreground/10 text-foreground shadow-inner"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <LanguageMenu />
            <ThemeMenu />
            {session ? (
              <button
                onClick={() => signOut()}
                className="ml-1 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:text-foreground"
              >
                <LogOut className="size-4" /> {t("nav.signOut")}
              </button>
            ) : (
              <Link
                to="/auth"
                className="ml-1 inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30"
                style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
              >
                <LogIn className="size-4" /> {t("nav.signIn")}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <LanguageMenu compact />
            <ThemeMenu compact />
            {session ? (
              <button
                onClick={() => signOut()}
                aria-label={t("nav.signOut")}
                className="rounded-md p-1.5 text-muted"
              >
                <LogOut className="size-4" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-md shadow-primary/30"
                style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }}
              >
                {t("nav.signIn")}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Floating circular HUD dock — spatial navigator */}
      <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 sm:hidden">
        <div
          className="aurora-glass flex items-center gap-1 rounded-full px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="Primary"
        >
          {links.map((l) => {
            const Icon = l.icon;
            const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                role="tab"
                aria-selected={active}
                aria-label={l.label}
                className={`group relative flex size-12 flex-col items-center justify-center rounded-full transition-all ${
                  active ? "text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)",
                        boxShadow:
                          "0 10px 30px -8px color-mix(in oklab, var(--primary) 60%, transparent)",
                      }
                    : undefined
                }
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.75} />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  return ref;
}

function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const langs: Lang[] = ["en", "ar", "ur"];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("lang.label")}
        className={`inline-flex items-center gap-1 rounded-md text-muted hover:text-foreground ${
          compact ? "p-1.5" : "px-2 py-1.5 text-xs font-bold uppercase tracking-widest"
        }`}
      >
        <Languages className="size-4" />
        {!compact && <span className="font-mono">{lang.toUpperCase()}</span>}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${
                lang === l ? "bg-foreground/10 font-semibold" : "hover:bg-foreground/5"
              }`}
            >
              <span>{LANG_META[l].native}</span>
              <span className="font-mono text-[10px] uppercase text-muted">{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const { theme, resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const options: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        className={`inline-flex items-center gap-1 rounded-md text-muted hover:text-foreground ${
          compact ? "p-1.5" : "px-2 py-1.5"
        }`}
      >
        <Icon className="size-4" />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {options.map((o) => {
            const OIcon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setTheme(o.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  theme === o.id ? "bg-foreground/10 font-semibold" : "hover:bg-foreground/5"
                }`}
              >
                <OIcon className="size-4" /> {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}