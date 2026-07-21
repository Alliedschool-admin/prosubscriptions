import { useMemo, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useReviews, upsertReview, deleteReview, useReviewsInvalidator } from "@/lib/reviews-store";

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`transition ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
        >
          <Star
            className={`size-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useReviews(productId);
  const invalidate = useReviewsInvalidator();

  const own = reviews.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState<number>(own?.rating ?? 5);
  const [title, setTitle] = useState(own?.title ?? "");
  const [body, setBody] = useState(own?.body ?? "");
  const [saving, setSaving] = useState(false);

  const avg = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews],
  );

  async function submit() {
    if (!user) {
      toast.info("Sign in to leave a review");
      return;
    }
    if (rating < 1) return;
    setSaving(true);
    try {
      await upsertReview({
        product_id: productId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
      });
      toast.success(own ? "Review updated" : "Review posted");
      invalidate(productId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete your review?")) return;
    try {
      await deleteReview(id);
      invalidate(productId);
      setTitle("");
      setBody("");
      setRating(5);
      toast.success("Review deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <section className="mt-10">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Reviews</p>
          <h2 className="text-2xl font-extrabold tracking-tight">What buyers say</h2>
        </div>
        {reviews.length > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Stars value={Math.round(avg)} />
              <span className="font-mono text-xs font-bold">{avg.toFixed(1)}</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </header>

      {user ? (
        <div className="mb-6 rounded-2xl border border-border bg-background/60 p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {own ? "Update your review" : "Leave a review"}
          </p>
          <Stars value={rating} onChange={setRating} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            maxLength={80}
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience…"
            rows={3}
            maxLength={1000}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            {own && (
              <button
                onClick={() => remove(own.id)}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-destructive"
              >
                <Trash2 className="size-3" /> Delete
              </button>
            )}
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : own ? "Update" : "Post review"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-6 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
          Sign in to leave a review.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet — be the first!</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.title && <p className="mt-2 text-sm font-bold">{r.title}</p>}
              {r.body && <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}