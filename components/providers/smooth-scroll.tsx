"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";

/**
 * Inertial scrolling for the marketing surfaces.
 *
 * Deliberately not applied to the document workspace: the clause scroll
 * spy and the dateline readout report the reader's exact position in the
 * contract, and an interpolated scroll offset makes that position a
 * guess. A legal document is read, not swept through.
 *
 * Under prefers-reduced-motion this renders its children and nothing
 * else, leaving native scroll untouched.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
