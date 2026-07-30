import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Digital Chacho" },
      { name: "description", content: "Set a new password for your Digital Chacho account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-consumes the recovery link on load and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecovery(true);
      }
    });
    // Also check if a session already exists (e.g., after redirect)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecovery(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-md items-center px-4 py-8 sm:py-12">
      <div className="w-full">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-foreground text-background">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Set a new password</h1>
          <p className="mt-2 text-sm text-muted">
            Pick a strong one — at least 6 characters.
          </p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted">Verifying reset link…</p>
        ) : !hasRecovery ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted">
              This recovery link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link
              to="/auth"
              search={{ mode: "reset" }}
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground"
            >
              Request new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center">
          <Link to="/auth" className="font-mono text-[10px] uppercase tracking-widest text-muted">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}