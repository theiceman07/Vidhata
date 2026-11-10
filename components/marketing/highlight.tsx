"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

/** A phrase marked with the highlighter (.mark-glow), drawn once when it is read. */
export function Highlight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const on = useInView(ref, { once: true, amount: 1, margin: "0px 0px -15% 0px" });

  return (
    <span ref={ref} data-on={on} className="mark-glow">
      {children}
    </span>
  );
}
