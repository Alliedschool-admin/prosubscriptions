import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * onPointerMove handler that writes --mx/--my CSS variables so `.spotlight`
 * elements can render a mouse-tracked glow.
 */
export function trackSpotlight(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--my", `${e.clientY - rect.top}px`);
}