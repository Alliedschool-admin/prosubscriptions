import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "app-theme";

function systemTheme(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(resolved: Resolved) {
  const root = document.documentElement;
  root.classList.toggle("light", resolved === "light");
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

type Ctx = {
  theme: ThemeChoice;
  resolved: Resolved;
  setTheme: (t: ThemeChoice) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("dark");
  const [resolved, setResolved] = useState<Resolved>("dark");

  useEffect(() => {
    let initial: ThemeChoice = "dark";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
      if (saved === "light" || saved === "dark" || saved === "system") initial = saved;
    } catch {
      /* ignore */
    }
    setThemeState(initial);
  }, []);

  useEffect(() => {
    const r = theme === "system" ? systemTheme() : theme;
    setResolved(r);
    applyTheme(r);

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const next: Resolved = mq.matches ? "light" : "dark";
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      resolved,
      setTheme: (t) => {
        setThemeState(t);
        try {
          localStorage.setItem(STORAGE_KEY, t);
        } catch {
          /* ignore */
        }
      },
    }),
    [theme, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}