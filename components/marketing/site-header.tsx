"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/brand-logo";

/**
 * The public header: one solid bar that floats over the page.
 *
 * It answers to what is behind it. At the top of the page it is ink; once
 * the page moves it turns white over light sections and stays ink, with a
 * faint outline, over a dark one (any section marked
 * data-nav-tone="dark"). The page shows through the gaps around it, so
 * there is no white strip above the content.
 */
type Tone = "top" | "light" | "dark";

/** How far down the viewport the bar reaches, for the tone test. */
const PROBE_Y = 52;

export function SiteHeader() {
  const [tone, setTone] = useState<Tone>("top");

  useEffect(() => {
    // One reading per frame at most: a scroll event can fire several
    // times a frame, and each reading measures every dark band.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const update = () => {
      if (window.scrollY < 24) {
        setTone("top");
        return;
      }
      const dark = Array.from(
        document.querySelectorAll<HTMLElement>('[data-nav-tone="dark"]'),
      ).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= PROBE_Y && r.bottom >= PROBE_Y;
      });
      setTone(dark ? "dark" : "light");
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const inked = tone !== "light";

  return (
    <header className="pointer-events-none sticky top-0 z-30 px-4 pt-3 sm:px-6">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 rounded-full border pl-7 pr-2.5 transition-colors duration-300",
          tone === "top" && "border-transparent bg-ink text-paper",
          tone === "light" && "border-line bg-paper text-ink",
          tone === "dark" && "border-paper/20 bg-ink text-paper",
        )}
      >
        <Link href="/" aria-label="Vidhata home">
          <BrandLogo size="md" />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-8">
          <Link
            href="/pricing"
            className={cn(
              "text-body font-medium transition-colors",
              inked ? "text-paper/75 hover:text-paper" : "text-muted-fg hover:text-ink",
            )}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className={cn(
              "inline-flex h-11 items-center rounded-full px-6 text-body font-medium transition-colors",
              inked
                ? "bg-paper text-ink hover:bg-parchment"
                : "bg-ink text-paper hover:bg-ink/85",
            )}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
