import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type BackgroundStyle =
  | "default"
  | "animated-grid"
  | "floating-particles"
  | "aurora"
  | "mesh";

export const BACKGROUNDS: {
  id: BackgroundStyle;
  name: string;
  blurb: string;
  /** CSS used for the admin preview thumbnail */
  preview: string;
}[] = [
  {
    id: "default",
    name: "Static Dark",
    blurb: "Clean premium dark backdrop. Zero motion.",
    preview: "radial-gradient(120% 80% at 50% -10%, #111 0%, transparent 60%), #090909",
  },
  {
    id: "animated-grid",
    name: "Animated Grid",
    blurb: "Slow floating grid with gently pulsing intersections.",
    preview:
      "radial-gradient(circle at 30% 40%, rgba(79,70,229,.5), transparent 45%), linear-gradient(to right,#2a2a2a 1px,transparent 1px) 0 0/16px 16px, linear-gradient(to bottom,#2a2a2a 1px,transparent 1px) 0 0/16px 16px, #090909",
  },
  {
    id: "floating-particles",
    name: "Floating Particles",
    blurb: "Soft glowing particles drifting with parallax.",
    preview:
      "radial-gradient(circle at 20% 30%, rgba(96,165,250,.6), transparent 12%), radial-gradient(circle at 70% 60%, rgba(34,211,238,.5), transparent 10%), radial-gradient(circle at 45% 80%, rgba(139,92,246,.5), transparent 12%), #090909",
  },
  {
    id: "aurora",
    name: "Aurora Glow",
    blurb: "Drifting cosmic light fields behind the content.",
    preview:
      "radial-gradient(circle at 25% 30%, rgba(124,92,255,.75), transparent 55%), radial-gradient(circle at 75% 30%, rgba(63,212,232,.6), transparent 55%), radial-gradient(circle at 55% 85%, rgba(247,179,61,.5), transparent 55%), #090909",
  },
  {
    id: "mesh",
    name: "Mesh Gradient",
    blurb: "Blurred multi-colour mesh, slow and cinematic.",
    preview:
      "radial-gradient(circle at 10% 20%, rgba(79,70,229,.8), transparent 55%), radial-gradient(circle at 85% 15%, rgba(6,182,212,.7), transparent 55%), radial-gradient(circle at 70% 85%, rgba(59,130,246,.7), transparent 55%), #090909",
  },
];

const SETTING_KEY = "site_background";
const CACHE_KEY = "site-background";

const isValid = (v: string): v is BackgroundStyle =>
  BACKGROUNDS.some((b) => b.id === v);

type Ctx = {
  background: BackgroundStyle;
  setBackground: (b: BackgroundStyle) => Promise<void>;
  saving: boolean;
};

const BackgroundContext = createContext<Ctx | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [background, setState] = useState<BackgroundStyle>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && isValid(cached)) setState(cached);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      if (cancelled) return;
      const value = (data?.value ?? null) as { background?: string } | null;
      const next = value?.background ?? "default";
      if (!isValid(next)) return;
      setState(next);
      try {
        localStorage.setItem(CACHE_KEY, next);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setBackground = useCallback(async (next: BackgroundStyle) => {
    setSaving(true);
    setState(next);
    try {
      localStorage.setItem(CACHE_KEY, next);
    } catch {
      /* ignore */
    }
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: SETTING_KEY, value: { background: next } }, { onConflict: "key" });
      if (error) throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ background, setBackground, saving }),
    [background, setBackground, saving],
  );
  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error("useBackground must be used within BackgroundProvider");
  return ctx;
}
