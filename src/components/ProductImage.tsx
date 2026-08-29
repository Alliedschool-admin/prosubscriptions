import { useState } from "react";

/**
 * Rewrites a Supabase public storage URL to the on-the-fly image
 * transformer endpoint at the requested width. Non-Supabase URLs
 * (bundled assets, external CDNs) are returned unchanged.
 */
function transform(src: string, width: number): string {
  if (!src.includes("/storage/v1/object/public/")) return src;
  const base = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=75&resize=cover`;
}

function buildSrcSet(src: string): string | undefined {
  if (!src.includes("/storage/v1/object/public/")) return undefined;
  return [320, 480, 640, 800, 1024]
    .map((w) => `${transform(src, w)} ${w}w`)
    .join(", ");
}

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

export function ProductImage({ src, alt, priority = false, className = "", sizes }: Props) {
  const [loaded, setLoaded] = useState(false);
  const srcSet = buildSrcSet(src);
  const displaySrc = srcSet ? transform(src, 640) : src;
  const defaultSizes = sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <div className="relative size-full overflow-hidden">
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              "linear-gradient(120deg, color-mix(in oklab, var(--muted) 20%, transparent) 0%, color-mix(in oklab, var(--muted) 40%, transparent) 50%, color-mix(in oklab, var(--muted) 20%, transparent) 100%)",
          }}
        />
      )}
      <img
        src={displaySrc}
        srcSet={srcSet}
        sizes={srcSet ? defaultSizes : undefined}
        alt={alt}
        width={800}
        height={800}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error - fetchpriority is valid HTML but not yet in React types
        fetchpriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`size-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </div>
  );
}