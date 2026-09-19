"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New deal", icon: FilePlus2 },
];

export function ClientShellNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop: left sidebar */}
      <nav className="hidden shrink-0 border-r border-line bg-paper px-4 py-6 md:flex md:w-56 md:flex-col">
        <Link href="/dashboard" className="mb-6 font-display text-h3 text-ink">
          Vidhata
        </Link>
        <div className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-control px-3 py-2 text-body transition-colors",
                isActive(link.href)
                  ? "bg-brand text-brand-fg"
                  : "text-ink hover:bg-canvas",
              )}
            >
              <link.icon className="h-4 w-4" aria-hidden />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile: brand bar on top, nav becomes a fixed bottom bar */}
      <header className="flex items-center border-b border-line bg-paper px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-display text-h3 text-ink">
          Vidhata
        </Link>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-small transition-colors",
              isActive(link.href) ? "text-brand" : "text-muted-fg",
            )}
          >
            <link.icon className="h-5 w-5" aria-hidden />
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
