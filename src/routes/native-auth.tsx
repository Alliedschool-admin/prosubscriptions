import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/**
 * Bridge used by the Digital Chacho Android app for Google sign-in.
 * Supabase's own /authorize endpoint has no Google secret (sign-in is brokered
 * by Lovable), so the app opens this page instead: it runs the normal web
 * Google flow, then hands the session back over the digitalchacho:// deep link.
 */
export const Route = createFileRoute("/native-auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Digital Chacho" },
      { name: "description", content: "Finishing Google sign-in for the Digital Chacho app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NativeAuthBridge,
});

function NativeAuthBridge() {
  const [message, setMessage] = useState("Connecting to Google…");

  useEffect(() => {
    let cancelled = false;

    const handOff = (refresh: string, access: string) => {
      setMessage("Signed in — returning to the app…");
      window.location.href = `digitalchacho://auth#refresh_token=${encodeURIComponent(refresh)}&access_token=${encodeURIComponent(access)}`;
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.refresh_token) {
        handOff(session.refresh_token, session.access_token);
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/native-auth`,
      });
      if (cancelled) return;
      if (result.error) {
        setMessage("Google sign-in failed. Close this tab and try email sign-in in the app.");
        return;
      }
      if (result.redirected) return;
      const after = await supabase.auth.getSession();
      if (after.data.session?.refresh_token) {
        handOff(after.data.session.refresh_token, after.data.session.access_token);
      } else {
        setMessage("Could not complete sign-in. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-extrabold tracking-tight">Digital Chacho</h1>
      <p className="text-sm text-muted">{message}</p>
    </main>
  );
}
