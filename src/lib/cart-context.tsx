import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  kind: "product" | "plan";
  id: string;
  name: string;
  subtitle: string;
  price_usd?: number | null;
  price_pkr?: number | null;
  cadence?: string;
  available_stock?: number;
};

type CartCtx = {
  item: CartItem | null;
  isOpen: boolean;
  openWith: (item: CartItem) => void;
  close: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

const STORAGE_KEY = "vault-cart-item";

export function CartProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<CartItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Restore last item after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItem(JSON.parse(raw) as CartItem);
    } catch { /* ignore */ }
  }, []);

  // Persist item across reloads.
  useEffect(() => {
    try {
      if (item) localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, [item]);

  const openWith = useCallback((next: CartItem) => {
    setItem(next);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ item, isOpen, openWith, close }), [item, isOpen, openWith, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}