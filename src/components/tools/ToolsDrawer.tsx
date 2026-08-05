import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Copy,
  Unlock,
  QrCode,
  KeyRound,
  Type,
  Calculator,
  NotebookPen,
  Bell,
  BellOff,
  Check,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  COPY_UNLOCK_BOOKMARKLET,
  copySelectionOrPage,
  isCopyUnlocked,
  setCopyUnlocked,
} from "../../lib/copy-unlock";
import {
  notificationPermission,
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
  showNotification,
} from "../../lib/notifications";

export type ToolId = "copy" | "qr" | "password" | "text" | "calc" | "notes" | "alerts";

export const TOOLS: { id: ToolId; label: string; desc: string; icon: typeof Copy; shortcut?: string }[] = [
  { id: "copy", label: "Copy Unlocker", desc: "Select & copy text on pages that block it", icon: Unlock, shortcut: "Alt + U" },
  { id: "qr", label: "QR Generator", desc: "Turn any link or text into a QR code", icon: QrCode },
  { id: "password", label: "Password Vault Gen", desc: "Strong passwords for client accounts", icon: KeyRound },
  { id: "text", label: "Text Toolkit", desc: "Word count, case convert, clean-up", icon: Type },
  { id: "calc", label: "Profit Calculator", desc: "Cost, price, margin & profit in seconds", icon: Calculator },
  { id: "notes", label: "Quick Notes", desc: "Scratchpad saved on this device", icon: NotebookPen },
  { id: "alerts", label: "Alerts & Permissions", desc: "Announcement notifications", icon: Bell },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-xl">{children}</div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60 ${props.className ?? ""}`}
    />
  );
}

function Btn({
  children,
  onClick,
  variant = "solid",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        variant === "solid"
          ? "text-primary-foreground shadow-lg shadow-primary/25"
          : "border border-border/70 text-foreground hover:bg-foreground/5"
      } ${className}`}
      style={
        variant === "solid"
          ? { background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/* ---------------- individual tools ---------------- */

function CopyTool() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isCopyUnlocked()), []);
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Unlock text selection here</p>
            <p className="mt-0.5 text-xs text-muted">
              Re-enables right-click, selection and copy across this app.
            </p>
          </div>
          <button
            onClick={() => {
              const next = !on;
              setCopyUnlocked(next);
              setOn(next);
              toast.success(next ? "Copy unlocked" : "Copy lock restored");
            }}
            role="switch"
            aria-checked={on}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-foreground/15"}`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"}`}
            />
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-bold">Grab text from this screen</p>
        <p className="mt-0.5 text-xs text-muted">
          Highlight anything then copy — or copy the whole page at once.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            onClick={async () => {
              const r = await copySelectionOrPage();
              if (r.ok) toast.success(`Copied ${r.chars.toLocaleString()} characters`);
              else toast.error("Nothing to copy");
            }}
          >
            <Copy className="size-4" /> Copy selection / page
          </Btn>
          <span className="self-center font-mono text-[10px] uppercase tracking-widest text-muted">
            Alt + C
          </span>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-bold">Works on other websites too</p>
        <p className="mt-0.5 text-xs text-muted">
          Copy this one-line bookmarklet, save it as a browser bookmark, then tap it on any site that
          blocks copying.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(COPY_UNLOCK_BOOKMARKLET);
                toast.success("Bookmarklet copied — paste it as a bookmark URL");
              } catch {
                toast.error("Clipboard blocked by browser");
              }
            }}
          >
            <Copy className="size-4" /> Copy bookmarklet
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              const blob = new Blob(
                [
                  `<a href="${COPY_UNLOCK_BOOKMARKLET.replace(/"/g, "&quot;")}">Unlock Copy — Digital Chacho</a>`,
                ],
                { type: "text/html" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "unlock-copy-bookmarklet.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4" /> Save as file
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function QrTool() {
  const [value, setValue] = useState("https://www.digitalchacho.store");
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(value || " ")}`;
  return (
    <div className="space-y-3">
      <Card>
        <p className="mb-2 text-sm font-bold">Link or text</p>
        <Field value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://…" />
      </Card>
      <Card>
        <div className="flex flex-col items-center gap-3">
          <img
            src={src}
            alt="Generated QR code"
            width={220}
            height={220}
            className="rounded-xl bg-white p-2"
          />
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-semibold hover:bg-foreground/5"
          >
            <Download className="size-4" /> Open / download PNG
          </a>
        </div>
      </Card>
    </div>
  );
}

function PasswordTool() {
  const [len, setLen] = useState(16);
  const [symbols, setSymbols] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [pw, setPw] = useState("");

  function gen() {
    let chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    if (numbers) chars += "23456789";
    if (symbols) chars += "!@#$%^&*()-_=+[]{}?";
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    setPw(Array.from(arr, (n) => chars[n % chars.length]).join(""));
  }
  useEffect(() => {
    gen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len, symbols, numbers]);

  return (
    <div className="space-y-3">
      <Card>
        <p className="break-all font-mono text-base font-bold">{pw || "—"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={gen}>Regenerate</Btn>
          <Btn
            variant="ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(pw);
              toast.success("Password copied");
            }}
          >
            <Copy className="size-4" /> Copy
          </Btn>
        </div>
      </Card>
      <Card>
        <label className="flex items-center justify-between text-sm font-semibold">
          Length <span className="font-mono">{len}</span>
        </label>
        <input
          type="range"
          min={8}
          max={48}
          value={len}
          onChange={(e) => setLen(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--primary)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { on: numbers, set: setNumbers, label: "Numbers" },
            { on: symbols, set: setSymbols, label: "Symbols" },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => o.set(!o.on)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                o.on ? "border-primary/50 bg-primary/15 text-foreground" : "border-border/70 text-muted"
              }`}
            >
              {o.on && <Check className="size-3" />} {o.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TextTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      words,
      chars: text.length,
      lines: text ? text.split(/\n/).length : 0,
      read: Math.max(1, Math.round(words / 200)),
    };
  }, [text]);
  const actions: { label: string; fn: (s: string) => string }[] = [
    { label: "UPPER", fn: (s) => s.toUpperCase() },
    { label: "lower", fn: (s) => s.toLowerCase() },
    { label: "Title Case", fn: (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) },
    { label: "Clean spaces", fn: (s) => s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() },
    { label: "Remove line breaks", fn: (s) => s.replace(/\s*\n\s*/g, " ").trim() },
  ];
  return (
    <div className="space-y-3">
      <Card>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Paste text here…"
          className="w-full resize-y rounded-xl border border-border/70 bg-background/60 p-3 text-sm outline-none focus:border-primary/60"
        />
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ["Words", stats.words],
            ["Chars", stats.chars],
            ["Lines", stats.lines],
            ["Min read", stats.read],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-border/60 bg-background/40 py-2">
              <p className="font-mono text-sm font-bold">{v as number}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">{l as string}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Btn key={a.label} variant="ghost" onClick={() => setText((s) => a.fn(s))}>
              {a.label}
            </Btn>
          ))}
          <Btn
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              toast.success("Copied");
            }}
          >
            <Copy className="size-4" /> Copy
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function CalcTool() {
  const [cost, setCost] = useState("0");
  const [price, setPrice] = useState("0");
  const [qty, setQty] = useState("1");
  const c = Number(cost) || 0;
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  const profit = (p - c) * q;
  const margin = p > 0 ? ((p - c) / p) * 100 : 0;
  const markup = c > 0 ? ((p - c) / c) * 100 : 0;
  return (
    <div className="space-y-3">
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Cost", cost, setCost],
            ["Sell price", price, setPrice],
            ["Quantity", qty, setQty],
          ].map(([label, val, set]) => (
            <label key={label as string} className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
                {label as string}
              </span>
              <Field
                type="number"
                inputMode="decimal"
                value={val as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
              />
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Profit", profit.toLocaleString(undefined, { maximumFractionDigits: 2 })],
            ["Margin", `${margin.toFixed(1)}%`],
            ["Markup", `${markup.toFixed(1)}%`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border/60 bg-background/40 py-3">
              <p className="font-mono text-base font-bold text-primary">{v}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">{l}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const NOTES_KEY = "dc_quick_notes_v1";
function NotesTool() {
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setText(localStorage.getItem(NOTES_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(NOTES_KEY, text);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <Card>
      <p className="mb-2 text-xs text-muted">Autosaved on this device.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="Client details, order notes, ideas…"
        className="w-full resize-y rounded-xl border border-border/70 bg-background/60 p-3 text-sm outline-none focus:border-primary/60"
      />
    </Card>
  );
}

function AlertsTool() {
  const [perm, setPerm] = useState<string>("default");
  const [on, setOn] = useState(false);
  useEffect(() => {
    setPerm(notificationPermission());
    setOn(notificationsEnabled());
  }, []);
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm font-bold">Announcement notifications</p>
        <p className="mt-0.5 text-xs text-muted">
          Get a device notification the moment we post a restock, drop or announcement.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Permission: {perm}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {perm !== "granted" ? (
            <Btn
              onClick={async () => {
                const r = await requestNotificationPermission();
                setPerm(r);
                setOn(notificationsEnabled());
                if (r === "granted") toast.success("Notifications enabled");
                else if (r === "denied") toast.error("Blocked in browser settings");
              }}
            >
              <Bell className="size-4" /> Allow notifications
            </Btn>
          ) : (
            <>
              <Btn
                variant="ghost"
                onClick={() => {
                  const next = !on;
                  setNotificationsEnabled(next);
                  setOn(next);
                }}
              >
                {on ? <BellOff className="size-4" /> : <Bell className="size-4" />}{" "}
                {on ? "Mute" : "Unmute"}
              </Btn>
              <Btn
                onClick={() => {
                  const sent = showNotification(
                    "Digital Chacho",
                    "Test notification — you're all set ✓",
                    "dc-test",
                  );
                  if (!sent) toast.error("Notifications are muted");
                }}
              >
                Send test
              </Btn>
            </>
          )}
        </div>
      </Card>
      <Card>
        <p className="text-sm font-bold">Keyboard shortcuts</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {[
            ["Alt + T", "Open the tools panel"],
            ["Alt + U", "Toggle copy unlocker"],
            ["Alt + C", "Copy selection / whole page"],
            ["⌘ / Ctrl + K", "Command palette"],
          ].map(([k, d]) => (
            <li key={k} className="flex items-center justify-between gap-3">
              <span className="text-muted">{d}</span>
              <kbd className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[11px]">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------- drawer shell ---------------- */

export function ToolsDrawer({
  open,
  tool,
  onTool,
  onClose,
}: {
  open: boolean;
  tool: ToolId;
  onTool: (t: ToolId) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const active = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const ActiveIcon = active.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Business tools"
        className="relative flex max-h-[90svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border/70 bg-card/85 shadow-2xl backdrop-blur-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <ActiveIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{active.label}</p>
              <p className="truncate text-[11px] text-muted">{active.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tools"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border/70 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-border/60 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tool;
            return (
              <button
                key={t.id}
                onClick={() => onTool(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  on
                    ? "text-primary-foreground shadow-md shadow-primary/25"
                    : "border border-border/70 text-muted hover:text-foreground"
                }`}
                style={
                  on
                    ? { background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-glow) 100%)" }
                    : undefined
                }
              >
                <Icon className="size-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tool === "copy" && <CopyTool />}
          {tool === "qr" && <QrTool />}
          {tool === "password" && <PasswordTool />}
          {tool === "text" && <TextTool />}
          {tool === "calc" && <CalcTool />}
          {tool === "notes" && <NotesTool />}
          {tool === "alerts" && <AlertsTool />}
        </div>
      </div>
    </div>
  );
}
