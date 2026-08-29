import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Skin = "aurora" | "ember" | "mint" | "noir";

export const SKINS: { id: Skin; name: string; blurb: string; swatch: string[] }[] = [
  {
    id: "aurora",
    name: "Aurora Obsidian",
    blurb: "Cosmic violet + teal glass. The current signature look.",
    swatch: ["#0b0b0f", "#7c5cff", "#3fd4e8", "#f7b33d"],
  },
  {
    id: "ember",
    name: "Ember Noir",
    blurb: "Charcoal with molten orange and gold heat.",
    swatch: ["#0e0c0a", "#f97316", "#fbbf24", "#f5e6d3"],
  },
  {
    id: "mint",
    name: "Neon Mint",
    blurb: "Ink-black with electric mint and cyan energy.",
    swatch: ["#03090c", "#19e8a6", "#38e0e8", "#e6fff6"],
  },
  {
    id: "noir",
    name: "Noir Gold",
    blurb: "Pure black, editorial gold, calm and luxurious.",
    swatch: ["#0a0a0a", "#c9a84c", "#f0d78c", "#f5f2ea"],
  },
];

const SETTING_KEY = "site_skin";
const CACHE_KEY = "site-skin";

export function applySkin(skin: Skin) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (skin === "aurora") root.removeAttribute("data-skin");
  else root.setAttribute("data-skin", skin);
}

type Ctx = { skin: Skin; setSkin: (s: Skin) => Promise<void>; saving: boolean };
const SkinContext = createContext<Ctx | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("aurora");
  const [saving, setSaving] = useState(false);

  // Instant paint from cache, then reconcile with the server value.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY) as Skin | null;
      if (cached && SKINS.some((s) => s.id === cached)) {
        setSkinState(cached);
        applySkin(cached);
      }
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
      const value = (data?.value ?? null) as { skin?: string } | null;
      const next = (value?.skin ?? "aurora") as Skin;
      if (!SKINS.some((s) => s.id === next)) return;
      setSkinState(next);
      applySkin(next);
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

  const setSkin = useCallback(async (next: Skin) => {
    setSaving(true);
    setSkinState(next);
    applySkin(next);
    try {
      localStorage.setItem(CACHE_KEY, next);
    } catch {
      /* ignore */
    }
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: SETTING_KEY, value: { skin: next } }, { onConflict: "key" });
      if (error) throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo<Ctx>(() => ({ skin, setSkin, saving }), [skin, setSkin, saving]);
  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error("useSkin must be used within SkinProvider");
  return ctx;
}
