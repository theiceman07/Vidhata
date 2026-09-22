"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";

/**
 * The public header.
 *
 * Transparent over the hero, then a paper surface with a hairline once
 * the page has moved. One bar, because a second bar would have to carry
 * something worth the room, and the stage index in the document arc
 * already says where the reader is.
 *
 * QA 10.2: the two portals are peer entry points, so both sign-ins sit
 * here rather than one being buried in the footer.
 */
const LINKS = [
  { href: "/#arc", label: "How it works" },
  { href: "/#india", label: "India" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#advocates", label: "For advocates" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-colors duration-200",
        scrolled ? "border-b border-line bg-paper/95 backdrop-blur-sm" : "",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[95rem] flex-wrap items-center justify-between gap-y-3 px-6 transition-all duration-200 lg:px-10",
          scrolled ? "py-3" : "py-5",
        )}
      >
        <Link href="/" className="text-ink">
          <BrandLogo size={scrolled ? "sm" : "md"} />
        </Link>

        <nav aria-label="Main" className="flex flex-wrap items-center gap-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-meta text-muted-fg transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}

          <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />

          <Link
            href="/login"
            className="text-meta text-muted-fg transition-colors hover:text-ink"
          >
            Client login
          </Link>
          <Link
            href="/advocate-login"
            className="text-meta text-muted-fg transition-colors hover:text-ink"
          >
            Advocate login
          </Link>
          <Button asChild size="sm">
            <Link href="/new">Start a document</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
