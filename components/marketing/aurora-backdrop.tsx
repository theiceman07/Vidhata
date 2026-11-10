"use client";

import { useEffect, useState } from "react";
import { Aurora } from "./aurora";

/** Brand tokens are stored as "r g b" triplets (see globals.css). */
function token(name: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  return parts.length === 3 ? `rgb(${parts.join(", ")})` : fallback;
}

/**
 * A warm aurora behind a section: the highlighter yellow flowing into the
 * pending orange and back. Drawn as soft pastel light for the paper
 * background (lightMode). The colours come from the design tokens, so the
 * wash follows the brand rather than a hard-coded palette.
 */
export function AuroraBackdrop({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<string[] | null>(null);

  useEffect(() => {
    const yellow = token("--c-highlight-bg", "rgb(253, 224, 71)");
    const amber = token("--c-status-pending", "rgb(245, 158, 11)");
    setStops([yellow, amber, yellow]);
  }, []);

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {stops ? (
          <Aurora
            colorStops={stops}
            lightMode
            amplitude={1.3}
            blend={0.8}
            height={1}
            glow={0.8}
            speed={1.4}
            layers={2}
            scale={0.9}
            opacity={0.5}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
