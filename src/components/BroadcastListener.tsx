import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISMISSED_KEY = "dismissed-broadcasts";

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function addDismissed(id: string) {
  try {
    const s = getDismissed();
    s.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(s).slice(-100)));
  } catch { /* ignore */ }
}

function show(id: string, message: string) {
  const dismissed = getDismissed();
  if (dismissed.has(id)) return;
  toast(message, {
    id,
    duration: 10000,
    icon: <Megaphone className="size-4 text-primary" />,
    onDismiss: () => addDismissed(id),
    onAutoClose: () => addDismissed(id),
  });
}

export function BroadcastListener() {
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    (async () => {
      const { data } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)(
        "broadcasts",
      )
        .select("id,message,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      const rows = (data ?? []) as { id: string; message: string }[];
      rows.slice().reverse().forEach((b) => show(b.id, b.message));
    })();

    const channel = supabase
      .channel("broadcasts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload) => {
          const row = payload.new as { id: string; message: string; active: boolean };
          if (row.active) show(row.id, row.message);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  return null;
}