import { useEffect, useRef, useState } from "react";
import { Wrench, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { TOOLS, ToolsDrawer, type ToolId } from "./ToolsDrawer";
import {
  copySelectionOrPage,
  initCopyUnlock,
  isCopyUnlocked,
  setCopyUnlocked,
} from "../../lib/copy-unlock";

export function ToolsMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tool, setTool] = useState<ToolId>("copy");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initCopyUnlock();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // global shortcuts
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === "t") {
        e.preventDefault();
        setDrawer((v) => !v);
      } else if (k === "u") {
        e.preventDefault();
        const next = !isCopyUnlocked();
        setCopyUnlocked(next);
        toast.success(next ? "Copy unlocked on this page" : "Copy lock restored");
      } else if (k === "c") {
        const r = await copySelectionOrPage();
        if (r.ok) toast.success(`Copied ${r.chars.toLocaleString()} characters`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function launch(id: ToolId) {
    setTool(id);
    setDrawer(true);
    setOpen(false);
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Business tools"
          aria-expanded={open}
          className={`inline-flex items-center gap-1 rounded-md text-muted transition hover:text-foreground ${
            compact ? "p-1.5" : "px-2 py-1.5"
          }`}
        >
          <Wrench className="size-4" />
          {!compact && <ChevronDown className="size-3 opacity-70" />}
        </button>

        {open && (
          <div className="absolute end-0 z-50 mt-2 w-[17rem] overflow-hidden rounded-2xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl">
            <p className="px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Free tools
            </p>
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => launch(t.id)}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-start transition hover:bg-foreground/5"
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{t.label}</span>
                      {t.shortcut && (
                        <kbd className="ms-auto shrink-0 rounded border border-border/70 px-1.5 py-0.5 font-mono text-[9px] text-muted">
                          {t.shortcut}
                        </kbd>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted">{t.desc}</span>
                  </span>
                </button>
              );
            })}
            <div className="mt-1 border-t border-border/60 px-2.5 py-2">
              <p className="flex items-center justify-between text-[11px] text-muted">
                Open tools panel
                <kbd className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[9px]">
                  Alt + T
                </kbd>
              </p>
            </div>
          </div>
        )}
      </div>

      <ToolsDrawer open={drawer} tool={tool} onTool={setTool} onClose={() => setDrawer(false)} />
    </>
  );
}
