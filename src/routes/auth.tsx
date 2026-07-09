import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "../hooks/use-auth";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Vault.01" },
      { name: "description", content: "Sign in to Vault.01 to manage your library and admin console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: (redirect as any) || "/dashboard", replace: true });
    }
  }, [loading, session, redirect, navigate]);

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      // If redirected, browser navigates away. Otherwise session set.
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-10">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Secure · Vault.01
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signin" ? "Access your library and admin tools." : "Join the vault in seconds."}
          </p>
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-bold hover:bg-foreground/5 disabled:opacity-50"
        >
          <GoogleGlyph /> Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-bold text-foreground underline underline-offset-4"
          >
            {mode === "signin" ? "Create an account" : "Sign in instead"}
          </button>
        </p>

        <p className="mt-8 text-center">
          <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted">
            ← Back to vault
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}