import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Category, type Product } from "./mock-data";
import kineticImg from "../assets/products/kinetic.jpg";
import swissImg from "../assets/products/swiss.jpg";
import neuralImg from "../assets/products/neural.jpg";
import edgeImg from "../assets/products/edge.jpg";

// Map seed product IDs to their bundled image assets so DB rows created via
// migration keep working even though the DB stores a placeholder path.
const SEED_IMAGES: Record<string, string> = {
  "kinetic-presets": kineticImg,
  "swiss-grid-system": swissImg,
  "neural-prompts": neuralImg,
  "edge-stack-template": edgeImg,
};

type ProductRow = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  price: number | string;
  price_usd: number | string | null;
  price_pkr: number | string | null;
  category: string;
  image: string;
  features: string[] | null;
  available_stock?: number | null;
};

function rowToProduct(r: ProductRow): Product {
  const usd = r.price_usd == null ? null : Number(r.price_usd);
  const pkr = r.price_pkr == null ? null : Number(r.price_pkr);
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    price: Number(r.price),
    price_usd: usd,
    price_pkr: pkr,
    category: r.category as Category,
    image: SEED_IMAGES[r.id] ?? r.image,
    features: Array.isArray(r.features) ? r.features : [],
    available_stock: r.available_stock == null ? 0 : Number(r.available_stock),
  };
}

export const PRODUCTS_QUERY_KEY = ["products"] as const;

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, tagline, description, price, price_usd, price_pkr, category, image, features, available_stock")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export function useProducts() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchProducts,
    staleTime: 30_000,
  });
  const products = query.data ?? [];
  return {
    products,
    loading: query.isLoading,
    error: query.error as Error | null,
    getProduct: (id: string) => products.find((p) => p.id === id),
    refetch: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  };
}

export type NewProductInput = Omit<Product, "id" | "image" | "price"> & {
  id?: string;
  image?: string;
  price?: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProduct(input: NewProductInput): Promise<Product> {
  const id = (input.id?.trim() || slugify(input.name) || `vlt-${Date.now()}`).slice(0, 60);
  const { data: userData } = await supabase.auth.getUser();
  const priceLegacy = input.price ?? input.price_usd ?? input.price_pkr ?? 0;
  const { data, error } = await supabase
    .from("products")
    .insert({
      id,
      code: input.code,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      price: priceLegacy,
      price_usd: input.price_usd ?? null,
      price_pkr: input.price_pkr ?? null,
      category: input.category,
      image: input.image || "",
      features: input.features,
      created_by: userData.user?.id ?? null,
    })
    .select("id, code, name, tagline, description, price, price_usd, price_pkr, category, image, features, available_stock")
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}