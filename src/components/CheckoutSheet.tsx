import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Lock, Upload, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart } from "../lib/cart-context";
import { useAuth } from "../hooks/use-auth";
import { applyCouponRpc, redeemCouponRpc, type AppliedCoupon } from "../lib/coupons-store";
import {
  usePaymentMethods,
  createOrder,
  uploadPaymentProof,
  useOrdersInvalidator,
  PAYMENT_KIND_LABEL,
  type PaymentMethod,
} from "../lib/orders-store";
import { toast } from "sonner";
import { formatMoney, type Currency } from "../lib/price";

export function CheckoutSheet() {
  const { item, isOpen, close } = useCart();
  const { user } = useAuth();
  const { data: methods = [], isLoading: methodsLoading } = usePaymentMethods({ activeOnly: true });
  const invalidateOrders = useOrdersInvalidator();

  const availableCurrencies = useMemo<Currency[]>(() => {
    if (!item) return [];
    const cs: Currency[] = [];
    if (item.price_usd != null && Number(item.price_usd) > 0) cs.push("USD");
    if (item.price_pkr != null && Number(item.price_pkr) > 0) cs.push("PKR");
    return cs;
  }, [item]);
  const [currency, setCurrency] = useState<Currency>("USD");

  const [quantity, setQuantity] = useState<number>(1);
  const maxQty = Math.min(item?.available_stock ?? 100, 100) || 1;

  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);

  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderContact, setSenderContact] = useState("");
  const [txRef, setTxRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [orderRef, setOrderRef] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setApplied(null);
      setPromoError(null);
      setSenderName("");
      setSenderContact("");
      setTxRef("");
      setProofFile(null);
      setConfirmed(false);
      setOrderRef("");
      if (availableCurrencies.length) setCurrency(availableCurrencies[0]);
      setSelectedMethodId("");
      setQuantity(1);
    }
  }, [isOpen, item?.id, availableCurrencies]);

  const filteredMethods = useMemo(
    () => methods.filter((m) => (m.currency ?? "PKR") === currency),
    [methods, currency],
  );

  useEffect(() => {
    if (filteredMethods.length === 0) {
      setSelectedMethodId("");
      return;
    }
    if (!filteredMethods.find((m) => m.id === selectedMethodId)) {
      setSelectedMethodId(filteredMethods[0].id);
    }
  }, [filteredMethods, selectedMethodId]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const raw = currency === "USD" ? item.price_usd : item.price_pkr;
    return raw == null ? 0 : Number(raw);
  }, [item, currency]);
  const subtotal = unitPrice * quantity;
  const discount = useMemo(() => applied?.discount ?? 0, [applied]);
  const total = Math.max(0, subtotal - discount);
  const selectedMethod: PaymentMethod | undefined = filteredMethods.find((m) => m.id === selectedMethodId);
  const money = (n: number) => formatMoney(currency, n);

  async function applyPromo() {
    const key = code.trim();
    if (!key) return;
    setApplyingCode(true);
    try {
      const result = await applyCouponRpc(key, subtotal, currency);
      setApplied(result);
      setPromoError(null);
    } catch (err) {
      setApplied(null);
      setPromoError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setApplyingCode(false);
    }
  }

  async function submitOrder() {
    if (!user || !item) return;
    if (!selectedMethod) {
      toast.error("Choose a payment method.");
      return;
    }
    if (!senderName.trim() || !senderContact.trim()) {
      toast.error("Enter your name and contact.");
      return;
    }
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (proofFile) {
        proofPath = await uploadPaymentProof(user.id, proofFile);
      }
      const order = await createOrder({
        buyer_id: user.id,
        item_kind: item.kind,
        item_id: item.id,
        item_name: item.name,
        amount: total,
        currency,
        quantity,
        payment_method_id: selectedMethod.id,
        payment_method_label: `${PAYMENT_KIND_LABEL[selectedMethod.kind]} · ${selectedMethod.label}`,
        sender_name: senderName.trim(),
        sender_contact: senderContact.trim(),
        transaction_ref: txRef.trim() || null,
        proof_path: proofPath,
        coupon_code: applied?.code ?? null,
        discount_amount: applied?.discount ?? 0,
      });
      if (applied?.code) {
        await redeemCouponRpc(applied.code);
      }
      invalidateOrders();
      setOrderRef(`VLT-${order.id.slice(0, 6).toUpperCase()}`);
      setConfirmed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
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
              {confirmed ? "ORDER SUBMITTED" : "CHECKOUT"}
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
              <h3 className="text-2xl font-extrabold tracking-tight">Awaiting verification</h3>
              <p className="max-w-xs text-sm text-muted">
                We&apos;ve received your order for <span className="font-bold text-foreground">{item.name}</span>.
                Once we confirm your transfer, it will unlock in your dashboard. This usually takes a few hours.
              </p>
              <div className="rounded-xl border border-border px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Order</p>
                <p className="font-mono text-sm font-bold">{orderRef}</p>
              </div>
              <button
                onClick={close}
                className="mt-4 w-full max-w-xs rounded-xl bg-foreground py-3 text-sm font-bold text-background"
              >
                Back to store
              </button>
            </div>
          ) : !user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <h3 className="text-xl font-extrabold tracking-tight">Sign in to check out</h3>
              <p className="max-w-xs text-sm text-muted">
                We need an account to track your order and unlock the download after verification.
              </p>
              <Link
                to="/auth"
                onClick={close}
                className="w-full max-w-xs rounded-xl bg-primary py-3 text-center text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
              >
                Sign in / Sign up
              </Link>
            </div>
          ) : methodsLoading ? (
            <div className="flex flex-1 items-center justify-center px-8 text-sm text-muted">
              Loading payment options…
            </div>
          ) : availableCurrencies.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <h3 className="text-lg font-extrabold tracking-tight">No price set</h3>
              <p className="max-w-xs text-sm text-muted">This item has no active price. Please try later.</p>
            </div>
          ) : methods.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <h3 className="text-lg font-extrabold tracking-tight">Checkout unavailable</h3>
              <p className="max-w-xs text-sm text-muted">
                No payment methods are configured yet. Please try again later.
              </p>
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
                    {money(unitPrice)}
                    {item.cadence ? <span className="text-muted"> {item.cadence}</span> : null}
                  </p>
                </div>

                {item.kind === "product" && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        Quantity
                      </p>
                      <p className="text-xs text-muted">
                        {item.available_stock != null
                          ? `${item.available_stock} in stock`
                          : "How many units?"}
                      </p>
                    </div>
                    <div className="inline-flex items-center rounded-xl bg-foreground/5 p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="grid size-9 place-items-center rounded-lg text-lg font-bold text-foreground disabled:text-muted"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-10 text-center font-mono text-base font-bold">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        disabled={quantity >= maxQty}
                        className="grid size-9 place-items-center rounded-lg text-lg font-bold text-foreground disabled:text-muted"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {availableCurrencies.length > 1 && (
                  <div className="space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Pay in
                    </p>
                    <div className="inline-flex w-full rounded-xl bg-foreground/5 p-1">
                      {availableCurrencies.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                            currency === c ? "bg-background shadow-sm" : "text-muted"
                          }`}
                        >
                          {c === "USD" ? "USD ($)" : "PKR (Rs)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    1 · Choose payment method
                  </p>
                  {filteredMethods.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                      No {currency} payment methods available yet.
                      {availableCurrencies.length > 1 ? " Try the other currency." : ""}
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {filteredMethods.map((m) => {
                        const active = m.id === selectedMethodId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethodId(m.id)}
                            className={`rounded-xl border p-3 text-left transition ${
                              active
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:border-foreground/20"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{m.label}</span>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                                {PAYMENT_KIND_LABEL[m.kind]}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedMethod && (
                  <div className="space-y-2 rounded-2xl bg-foreground/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      2 · Send {money(total)} to
                    </p>
                    {selectedMethod.account_name && (
                      <p className="text-sm">
                        <span className="text-muted">Name: </span>
                        <span className="font-bold">{selectedMethod.account_name}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                      <span className="truncate font-mono text-sm font-bold">
                        {selectedMethod.account_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(selectedMethod.account_number)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground"
                      >
                        <Copy className="size-3" /> Copy
                      </button>
                    </div>
                    {selectedMethod.instructions && (
                      <p className="whitespace-pre-line text-xs text-muted">
                        {selectedMethod.instructions}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    3 · Confirm your transfer
                  </p>
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name (as on the transfer)"
                    maxLength={80}
                    className="w-full rounded-lg border-none bg-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="Your phone or email"
                    maxLength={120}
                    className="w-full rounded-lg border-none bg-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    placeholder="Transaction ID / TXID (optional)"
                    maxLength={120}
                    className="w-full rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                  />
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-left text-sm hover:border-foreground/30"
                    >
                      <span className="flex items-center gap-2 text-muted">
                        <Upload className="size-4" />
                        {proofFile ? "Change screenshot" : "Upload payment screenshot (optional)"}
                      </span>
                      {proofFile && (
                        <span className="truncate max-w-[45%] font-mono text-[10px] uppercase text-primary">
                          {proofFile.name}
                        </span>
                      )}
                    </button>
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
                        setPromoError(null);
                      }}
                      placeholder="TRY PRO10"
                      className="flex-1 rounded-lg border-none bg-foreground/5 px-4 py-3 font-mono text-sm uppercase outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={applyingCode}
                      className="rounded-lg bg-foreground px-4 py-3 text-xs font-bold uppercase tracking-widest text-background"
                    >
                      {applyingCode ? "…" : "Apply"}
                    </button>
                  </div>
                  {applied && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                      ✓ {applied.code} applied · -${applied.discount.toFixed(2)}
                    </p>
                  )}
                  {promoError && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
                      {promoError}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-primary/5 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm font-bold text-primary">
                    <span>Discount</span>
                    <span>-{money(discount)}</span>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-primary/20 pt-4 text-lg font-extrabold">
                    <span>Total Due</span>
                    <span>
                      {money(total)}
                      {item.cadence ? <span className="text-sm font-normal text-muted"> {item.cadence}</span> : null}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-6">
                <button
                  onClick={submitOrder}
                  disabled={submitting || !selectedMethod}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : `Submit for verification · ${money(total)}`}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  <Lock className="size-3" /> Manually verified · No card data stored
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}