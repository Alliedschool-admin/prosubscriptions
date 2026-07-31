import { useEffect, useRef } from "react";
import { useBackground } from "@/lib/background";

const PARTICLE_COLORS = ["#FFFFFF", "#60A5FA", "#22D3EE", "#8B5CF6"];

function ParticleField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;

    type P = { x: number; y: number; r: number; vx: number; vy: number; c: string; depth: number };
    let parts: P[] = [];

    const build = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.max(18, Math.round((w * h) / 26000)));
      parts = Array.from({ length: count }, () => {
        const depth = 0.35 + Math.random() * 0.65;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 2 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 0.18 * depth,
          vy: (Math.random() - 0.5) * 0.18 * depth,
          c: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
          depth,
        };
      });
    };

    let mx = 0;
    let my = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 24;
      my = (e.clientY / window.innerHeight - 0.5) * 24;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.2;
      for (const p of parts) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }
        const px = p.x + mx * p.depth;
        const py = p.y + my * p.depth;
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.2);
        g.addColorStop(0, p.c);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, p.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    build();
    draw();
    const ro = new ResizeObserver(() => {
      build();
      if (reduced) draw();
    });
    ro.observe(canvas);
    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />;
}

/**
 * Fixed, non-interactive site backdrop. Modular: add a new case here + an
 * entry in BACKGROUNDS to ship another style.
 */
export function SiteBackground() {
  const { background } = useBackground();
  if (background === "default") return null;

  return (
    <div className="site-bg" aria-hidden>
      <div className="site-bg__base" />
      {background === "animated-grid" && (
        <>
          <div className="site-bg__grid" />
          <div className="site-bg__dots" />
        </>
      )}
      {background === "floating-particles" && <ParticleField />}
      {background === "aurora" && <div className="site-bg__aurora" />}
      {background === "mesh" && <div className="site-bg__mesh" />}
      <div className="site-bg__glow" />
      <div className="site-bg__noise" />
    </div>
  );
}
