import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products as seedProducts, type Product, type Category } from "./mock-data";

const STORAGE_KEY = "vault01.custom-products.v1";

type ProductsContextValue = {
  products: Product[];
  customProducts: Product[];
  getProduct: (id: string) => Product | undefined;
  addProduct: (input: Omit<Product, "id"> & { id?: string }) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function loadCustom(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCustomProducts(loadCustom());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
    } catch {
      /* ignore quota */
    }
  }, [customProducts, hydrated]);

  const value = useMemo<ProductsContextValue>(() => {
    const all = [...customProducts, ...seedProducts];
    return {
      products: all,
      customProducts,
      getProduct: (id) => all.find((p) => p.id === id),
      addProduct: (input) => {
        const baseId = input.id?.trim() || slugify(input.name) || `vlt-${Date.now()}`;
        let id = baseId;
        let n = 1;
        while (all.some((p) => p.id === id)) id = `${baseId}-${n++}`;
        const product: Product = {
          id,
          code: input.code || `VLT-${String(Math.floor(Math.random() * 900) + 100)}`,
          name: input.name,
          tagline: input.tagline,
          description: input.description,
          price: input.price,
          category: input.category as Category,
          image: input.image,
          features: input.features,
        };
        setCustomProducts((prev) => [product, ...prev]);
        return product;
      },
      updateProduct: (id, patch) =>
        setCustomProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      deleteProduct: (id) => setCustomProducts((prev) => prev.filter((p) => p.id !== id)),
    };
  }, [customProducts]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}