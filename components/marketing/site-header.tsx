import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

/**
 * The public header: one solid black bar that floats over the page. It is
 * black in light and dark mode alike (literal values, not the theme tokens,
 * which flip with the mode), so the page shows through the gaps around it.
 */
export function SiteHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-30 px-4 pt-3 sm:px-6">
      <div className="pointer-events-auto mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 rounded-full border border-white/20 bg-[#000000] pl-7 pr-2.5 text-[#FFFFFF]">
        <Link href="/" aria-label="Vidhata home">
          <BrandLogo size="md" />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center rounded-full px-4 text-body font-medium text-[#FFFFFF]/75 transition-colors hover:text-[#FFFFFF]"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-full bg-[#FFFFFF] px-6 text-body font-medium text-[#000000] transition-colors hover:bg-[#FFFFFF]/85"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
