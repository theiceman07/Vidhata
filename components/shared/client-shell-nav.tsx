"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New deal" },
];

export function ClientShellNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center gap-4 border-b border-line bg-paper px-4 py-3 md:w-56 md:flex-col md:items-stretch md:border-b-0 md:border-r md:px-4 md:py-6">
      <Link href="/dashboard" className="font-display text-h3 text-ink">
        Vidhata
      </Link>
      <div className="flex flex-1 gap-2 md:mt-6 md:flex-col md:gap-1">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-control px-3 py-2 text-body transition-colors",
                active
                  ? "bg-brand text-brand-fg"
                  : "text-ink hover:bg-canvas",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
