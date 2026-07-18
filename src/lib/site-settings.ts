import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettingValue = Record<string, unknown>;

/**
 * Reads a single site_settings row by key (public read). Returns the JSONB
 * value or null until loaded.
 */
export function useSiteSetting<T extends SiteSettingValue = SiteSettingValue>(key: string) {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    setValue((data?.value as T | undefined) ?? null);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { value, loading, reload: load };
}

/** Admin-only upsert helper. */
export async function setSiteSetting(key: string, value: SiteSettingValue) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}