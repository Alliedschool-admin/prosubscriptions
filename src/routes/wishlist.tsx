import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useWishlist } from "../lib/wishlist-store";
import { useProducts } from "../lib/products-store";
import { ProductCard } from "../components/ProductCard";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — Pro Subscriptions" },
      { name: "description", content: "Products you saved for later." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useWishlist();
  const { products } = useProducts();

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <Heart className="mx-auto size-8 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Sign in to save favorites</h1>
        <p className="mt-2 text-sm text-muted">Bookmark products to come back to later.</p>
        <Link
          to="/auth"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-widest text-primary-foreground"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const items = rows
    .map((r) => products.find((p) => p.id === r.product_id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8 lg:max-w-6xl lg:px-8 lg:pt-14">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
        <Heart className="mr-1 inline size-3" /> Favorites
      </p>
      <h1 className="text-2xl font-extrabold tracking-tight">MY WISHLIST</h1>
      <p className="mt-1 text-sm text-muted">Come back anytime — items stay saved to your account.</p>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">Your wishlist is empty. Tap the heart on any product to save it.</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-10">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </section>
      )}
    </main>
  );
}