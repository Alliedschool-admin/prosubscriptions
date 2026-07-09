import kineticImg from "../assets/products/kinetic.jpg";
import swissImg from "../assets/products/swiss.jpg";
import neuralImg from "../assets/products/neural.jpg";
import edgeImg from "../assets/products/edge.jpg";

export type Category = "Presets" | "UI Kits" | "AI Tools" | "Dev Templates";

export type Product = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  price_usd?: number | null;
  price_pkr?: number | null;
  category: Category;
  image: string;
  features: string[];
  available_stock?: number;
  delivery_instructions?: string | null;
  cost_usd?: number | null;
  cost_pkr?: number | null;
  is_free?: boolean;
};

export const products: Product[] = [
  {
    id: "kinetic-presets",
    code: "VLT-042",
    name: "KINETIC PRESETS",
    tagline: "Advanced motion system for After Effects",
    description:
      "A production-tested library of 120+ physics-based motion presets covering easing, spring, momentum, and choreographed sequences — installable directly into After Effects with one drag.",
    price: 49,
    category: "Presets",
    image: kineticImg,
    features: [
      "120+ physics-based presets",
      "One-drag install for AE 2022+",
      "Commercial license included",
      "Free lifetime updates",
    ],
  },
  {
    id: "swiss-grid-system",
    code: "VLT-089",
    name: "SWISS GRID SYSTEM",
    tagline: "Figma layout engine, engineered",
    description:
      "A rigorous 12-column responsive grid with baseline, modular scale, and 40+ composition templates. Built for editorial-grade Figma work.",
    price: 29,
    category: "UI Kits",
    image: swissImg,
    features: [
      "Responsive 4 / 8 / 12 column grid",
      "Baseline & modular scale tokens",
      "40+ layout templates",
      "Auto layout everywhere",
    ],
  },
  {
    id: "neural-prompts",
    code: "VLT-114",
    name: "NEURAL PROMPTS PACK",
    tagline: "500 field-tested prompts for GPT & Claude",
    description:
      "A curated library of 500 prompts across research, code review, writing, and product strategy — organized by role and outcome. Copy, tweak, ship.",
    price: 19,
    category: "AI Tools",
    image: neuralImg,
    features: [
      "500 prompts across 12 roles",
      "Chained workflow templates",
      "Notion + Raycast import",
      "Monthly refreshed drops",
    ],
  },
  {
    id: "edge-stack-template",
    code: "VLT-201",
    name: "EDGE STACK TEMPLATE",
    tagline: "Production-ready SaaS boilerplate",
    description:
      "A batteries-included TanStack + edge runtime starter with auth, billing hooks, transactional email, and a polished dashboard shell.",
    price: 59,
    category: "Dev Templates",
    image: edgeImg,
    features: [
      "TanStack Start + Tailwind v4",
      "Auth, billing, and mail scaffolds",
      "Dashboard + marketing shells",
      "Deploy to any edge target",
    ],
  },
];

export const categories: Array<"All" | Category> = [
  "All",
  "Presets",
  "UI Kits",
  "AI Tools",
  "Dev Templates",
];

export type Plan = {
  id: "free" | "monthly" | "annual";
  code: string;
  name: string;
  tagline: string;
  price: number;
  cadence: string;
  bestValue?: boolean;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "free",
    code: "LITE",
    name: "Starter",
    tagline: "Try the vault, no card required.",
    price: 0,
    cadence: "/mo",
    features: [
      "Access to 5 free assets monthly",
      "Personal-use license",
      "Community support",
    ],
  },
  {
    id: "monthly",
    code: "PRO M",
    name: "Monthly Pro",
    tagline: "Full vault, billed monthly.",
    price: 19,
    cadence: "/mo",
    features: [
      "Unlimited downloads",
      "Every current product",
      "Commercial license",
      "Priority support",
    ],
  },
  {
    id: "annual",
    code: "PRO A",
    name: "Annual Pro",
    tagline: "Two months free. Best value.",
    price: 179,
    cadence: "/yr",
    bestValue: true,
    features: [
      "Everything in Monthly Pro",
      "2 months free (save $49)",
      "Early access to new drops",
      "Founder Discord access",
    ],
  },
];

export const promoCodes: Record<string, { label: string; kind: "percent" | "flat"; value: number }> = {
  PRO10: { label: "PRO10 · 10% off", kind: "percent", value: 10 },
  LAUNCH25: { label: "LAUNCH25 · 25% off", kind: "percent", value: 25 },
  PRO50: { label: "PRO50 · $50 off", kind: "flat", value: 50 },
};

export const mockUser = {
  name: "Marcus Vane",
  handle: "@marcusv",
  initials: "MV",
  memberSince: "2024",
  plan: "Annual Pro",
  renews: "August 8, 2026",
  status: "Active" as const,
};

export const mockLibrary = [
  {
    productId: "kinetic-presets",
    purchasedOn: "Jan 12, 2026",
    lastDownload: "2h ago",
  },
  {
    productId: "swiss-grid-system",
    purchasedOn: "Mar 04, 2026",
    lastDownload: "Yesterday",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}