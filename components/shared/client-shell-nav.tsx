"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FilePlus2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { BrandLogo } from "@/components/shared/brand-logo";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New deal", icon: FilePlus2 },
];

export function ClientShellNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // QA 10.5 / 3.4: sign-out used to exist only inside the developer role
  // switcher, which production builds no longer render at all.
  function handleSignOut() {
    signOut();
    toast.success("Signed out.");
    router.replace("/");
  }

  return (
    <>
      {/* Desktop: left sidebar */}
      <nav className="hidden shrink-0 border-r border-line bg-paper px-4 py-6 md:flex md:w-56 md:flex-col">
        <Link href="/dashboard" className="mb-6 text-ink">
          <BrandLogo />
        </Link>
        <div className="flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-control px-3 py-2 text-body transition-colors",
                isActive(link.href)
                  ? "bg-accent font-medium text-accent-fg"
                  : "text-ink hover:bg-canvas",
              )}
            >
              <link.icon className="h-4 w-4" aria-hidden />
              {link.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-control px-3 py-2 text-body text-muted-fg transition-colors hover:bg-canvas hover:text-ink"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </nav>

      {/* Mobile: brand bar on top (with sign-out), nav becomes a fixed
          bottom bar */}
      <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-ink">
          <BrandLogo />
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex items-center gap-1 rounded-control px-2 py-1.5 text-small text-muted-fg hover:bg-canvas hover:text-ink"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper md:hidden">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 border-t-2 py-2.5 text-small transition-colors",
                // QA 10.6: colour was the only signal for the active tab
                // (a WCAG failure on its own, and easy to miss). A top
                // border plus a weight change give it a second channel.
                active
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-muted-fg",
              )}
            >
              <link.icon className="h-5 w-5" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
