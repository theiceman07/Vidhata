"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Paper fibre.
 *
 * The one piece of pure surface in the product, and it is doing a job:
 * the marketing pages claim a document metaphor, and a perfectly flat
 * white is the one thing paper never is. It is held to a whisper —
 * roughly three per cent opacity — so it reads as tooth rather than as
 * texture.
 *
 * Drawn once to a small offscreen tile and repeated by the browser.
 * Nothing animates per frame; there is no loop to leak.
 */
export function PaperTexture() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const host = ref.current;
    if (!host) return;

    const SIZE = 128;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = ctx.createImageData(SIZE, SIZE);
    for (let i = 0; i < image.data.length; i += 4) {
      // Monochrome noise. Ink, not colour: a tinted grain would read as
      // a gradient, which the board rules out.
      const value = 120 + Math.random() * 135;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    host.style.backgroundImage = `url(${canvas.toDataURL()})`;
    host.style.backgroundRepeat = "repeat";
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] mix-blend-multiply"
    />
  );
}
