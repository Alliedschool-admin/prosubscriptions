import { useEffect } from "react";
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
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getVisitorKey();
    const path = window.location.pathname;
    supabase
      .rpc("record_site_visit", {
        _visitor_key: key,
        _path: path,
        _user_agent: navigator.userAgent.slice(0, 500),
      })
      .then(({ error }) => {
        if (error) console.warn("[VisitorTracker] record_site_visit failed", error.message);
      });
  }, []);
  return null;
}