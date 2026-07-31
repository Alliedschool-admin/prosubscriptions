import { Check, Layers, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { SKINS, useSkin, type Skin } from "@/lib/skin";
import { BACKGROUNDS, useBackground, type BackgroundStyle } from "@/lib/background";
import { useTheme } from "@/lib/theme";

export function AppearancePanel() {
  const { skin, setSkin, saving } = useSkin();
  const { background, setBackground, saving: savingBg } = useBackground();
  const { theme, setTheme } = useTheme();

  async function pick(next: Skin) {
    try {
      await setSkin(next);
      toast.success("Theme applied to the whole site.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save theme");
    }
  }

  async function pickBg(next: BackgroundStyle) {
    try {
      await setBackground(next);
      toast.success("Background applied to the whole site.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save background");
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Palette className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Site appearance</h2>
          <p className="text-sm text-muted">
            Pick a design theme — it applies instantly for every visitor on the site.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SKINS.map((s) => {
          const active = skin === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              disabled={saving}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition disabled:opacity-70 ${
                active
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div
                className="h-20 w-full rounded-xl border border-border"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${s.swatch[0]} 0%, ${s.swatch[0]} 35%, ${s.swatch[1]} 65%, ${s.swatch[2]} 100%)`,
                }}
              />
              <div className="mt-3 flex items-center gap-2">
                {s.swatch.map((c) => (
                  <span
                    key={c}
                    className="size-4 rounded-full border border-border"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm font-bold">{s.name}</p>
              <p className="mt-1 text-xs text-muted">{s.blurb}</p>
              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                  active ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted"
                }`}
              >
                {saving && active ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : active ? (
                  <Check className="size-3" />
                ) : null}
                {active ? "Active" : "Apply"}
              </span>
            </button>
          );
        })}
      </div>

      <header className="flex items-start gap-3 pt-2">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Layers className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Background Style</h2>
          <p className="text-sm text-muted">
            Only one background is active at a time — it applies instantly for every visitor.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BACKGROUNDS.map((b) => {
          const active = background === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => pickBg(b.id)}
              disabled={savingBg}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition disabled:opacity-70 ${
                active
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div
                className="h-24 w-full rounded-xl border border-border"
                style={{ background: b.preview }}
              />
              <p className="mt-3 text-sm font-bold">{b.name}</p>
              <p className="mt-1 text-xs text-muted">{b.blurb}</p>
              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                  active ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted"
                }`}
              >
                {savingBg && active ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : active ? (
                  <Check className="size-3" />
                ) : null}
                {active ? "Active" : "Apply"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold">Default brightness</p>
        <p className="mt-1 text-xs text-muted">
          Your own preview mode. Visitors can still switch light/dark themselves.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["dark", "light", "system"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTheme(m)}
              className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                theme === m
                  ? "bg-foreground text-background"
                  : "bg-foreground/5 text-muted hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
