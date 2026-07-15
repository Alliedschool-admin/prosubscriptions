import { Heart } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import {
  useWishlist,
  addToWishlist,
  removeFromWishlist,
  useWishlistInvalidator,
} from "../lib/wishlist-store";

export function WishlistButton({
  productId,
  variant = "overlay",
}: {
  productId: string;
  variant?: "overlay" | "inline";
}) {
  const { user } = useAuth();
  const { data: rows = [] } = useWishlist();
  const invalidate = useWishlistInvalidator();
  const [busy, setBusy] = useState(false);
  const active = rows.some((r) => r.product_id === productId);

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to save favorites");
      return;
    }
    setBusy(true);
    try {
      if (active) {
        await removeFromWishlist(user.id, productId);
      } else {
        await addToWishlist(user.id, productId);
        toast.success("Saved to wishlist");
      }
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition ${
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted hover:text-foreground"
        }`}
      >
        <Heart className={`size-4 ${active ? "fill-current" : ""}`} />
        {active ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={`absolute right-3 top-3 grid size-9 place-items-center rounded-full backdrop-blur-md transition ${
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40"
          : "bg-background/60 text-foreground/70 hover:text-foreground"
      }`}
    >
      <Heart className={`size-4 ${active ? "fill-current" : ""}`} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}