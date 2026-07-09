import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function getVisitorKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem("visitor_key");
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem("visitor_key", k);
    }
    return k;
  } catch {
    return "";
  }
}

export function VisitorTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getVisitorKey();
    // fire and forget
    void supabase.rpc("record_site_visit", {
      _visitor_key: key,
      _path: pathname,
      _user_agent: navigator.userAgent.slice(0, 500),
    });
  }, [pathname]);
  return null;
}