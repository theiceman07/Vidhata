"use client";

import { useEffect, useRef } from "react";

/** Half the pointer light's width (.hero-glow-pointer in globals.css). */
const HALF = 320;

/**
 * A warm wash behind a full-width section (.hero-glow in globals.css): three
 * blobs that drift on their own, and a fourth that follows the pointer with
 * a little lag, so the light answers the visitor. Used by the hero and the
 * closing section. Touch and reduced motion get the drifting wash alone.
 */
export function GlowBackdrop({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const dot = light.current;
    if (!el || !dot) return;
    if (!window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let placed = false;

    // The light eases toward the pointer and the loop stops once it arrives,
    // so a still pointer costs nothing.
    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      dot.style.transform = `translate3d(${x - HALF}px, ${y - HALF}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!placed) {
        placed = true;
        x = tx;
        y = ty;
      }
      dot.dataset.on = "true";
      if (!frame) frame = requestAnimationFrame(step);
    };
    const leave = () => {
      dot.dataset.on = "false";
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={wrap} className="relative isolate overflow-hidden">
      <div aria-hidden className="hero-glow">
        <span />
        <span />
        <span />
        <span ref={light} className="hero-glow-pointer" />
      </div>
      {children}
    </div>
  );
}
