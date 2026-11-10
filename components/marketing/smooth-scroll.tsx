"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Eased wheel scrolling for the landing page, so the pinned document and
 * the scroll-linked rails move without steps. Native scrolling stays for
 * touch and for a reader who asked for less motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.12, anchors: true, autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return null;
}
