import { useEffect, useRef, useState } from "react";

/**
 * Animated numeric counter that runs once when scrolled into view.
 */
export function CountUp({
  to,
  duration = 1400,
  className,
  format = (n) => n.toLocaleString(),
}: {
  to: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(to * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) run();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}