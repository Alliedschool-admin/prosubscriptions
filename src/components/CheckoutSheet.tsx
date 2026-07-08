import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, X } from "lucide-react";
import { useCart } from "../lib/cart-context";
import { promoCodes } from "../lib/mock-data";

export function CheckoutSheet() {
  const { item, isOpen, close } = useCart();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [orderId] = useState(() => `VLT-${Math.floor(100000 + Math.random() * 899999)}`);

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setApplied(null);
      setError(null);
      setConfirmed(false);
    }
  }, [isOpen, item?.id]);

  const subtotal = item?.price ?? 0;
  const discount = useMemo(() => {
    if (!applied) return 0;
    return applied.discount;
  }, [applied]);
  const total = Math.max(0, subtotal - discount);

  function apply() {
    const key = code.trim().toUpperCase();
    const promo = promoCodes[key];
    if (!promo) {
      setError("Invalid or expired code.");
      setApplied(null);
      return;
    }
    const off = promo.kind === "percent" ? (subtotal * promo.value) / 100 : promo.value;
    setApplied({ code: key, discount: Math.round(off * 100) / 100 });
    setError(null);
  }

  if (!item) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={close} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-[32px] border-t border-border bg-background shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-0 sm:left-auto sm:top-0 sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[32px] ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <div className="flex h-[90vh] flex-col sm:h-full">
          <div className="relative flex items-center justify-center border-b border-border p-4">
            <div className="absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-foreground/10 sm:hidden" />
            <h2 className="text-lg font-extrabold tracking-tight">
              {confirmed ? "ORDER CONFIRMED" : "CHECKOUT"}
            </h2>
            <button
              onClick={close}
              className="absolute right-3 grid size-8 place-items-center rounded-full text-muted hover:bg-foreground/5"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {confirmed ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-8 text-primary" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">You&apos;re in.</h3>
              <p className="max-w-xs text-sm text-muted">
                {item.kind === "plan"
                  ? `Your ${item.name} is active. A receipt has been sent to your inbox.`
                  : `${item.name} is now in your Vault library, ready to download.`}
              </p>
              <div className="rounded-xl border border-border px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Order</p>
                <p className="font-mono text-sm font-bold">{orderId}</p>
              </div>
              <button
                onClick={close}
                className="mt-4 w-full max-w-xs rounded-xl bg-foreground py-3 text-sm font-bold text-background"
              >
                Back to Vault
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div className="min-w-0">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-muted">{item.subtitle}</p>
                  </div>
                  <p className="font-mono text-sm font-bold">
                    ${item.price.toFixed(2)}
                    {item.cadence ? <span className="text-muted"> {item.cadence}</span> : null}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Payment (simulated)
                  </label>
                  <input
                    className="w-full rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                    placeholder="4242 4242 4242 4242"
                    defaultValue="4242 4242 4242 4242"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm outline-none placeholder:text-muted"
                      placeholder="MM / YY"
                      defaultValue="08 / 29"
                    />
                    <input
                      className="rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm outline-none placeholder:text-muted"
                      placeholder="CVC"
                      defaultValue="123"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setError(null);
                      }}
                      placeholder="TRY VAULT10"
                      className="flex-1 rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm uppercase outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={apply}
                      className="rounded-lg bg-foreground px-4 py-3 text-xs font-bold uppercase tracking-widest text-background"
                    >
                      Apply
                    </button>
                  </div>
                  {applied && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                      ✓ {applied.code} applied · -${applied.discount.toFixed(2)}
                    </p>
                  )}
                  {error && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-primary/5 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm font-bold text-primary">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-primary/20 pt-4 text-lg font-extrabold">
                    <span>Total Due</span>
                    <span>
                      ${total.toFixed(2)}
                      {item.cadence ? <span className="text-sm font-normal text-muted"> {item.cadence}</span> : null}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-6">
                <button
                  onClick={() => setConfirmed(true)}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
                >
                  Confirm Order · ${total.toFixed(2)}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  <Lock className="size-3" /> Secure transaction · Encrypted Vault
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}