import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Icon } from "@/components/shared/icon";

/**
 * Sign in. One screen, one task.
 *
 * The two portals share this screen, and a toggle at the top switches
 * between them, so nobody has to hunt for the other door. The wordmark
 * and a way back to the site sit in a quiet bar above; everything else
 * is the form.
 */
const PORTALS = [
  { key: "client", label: "Client", href: "/login" },
  { key: "advocate", label: "Advocate", href: "/advocate-login" },
] as const;

export function AuthScreen({
  portal,
  title,
  intro,
  children,
  footer,
}: {
  portal: "client" | "advocate";
  title: string;
  /** One line of context. */
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 px-6 pt-10">
        <Link
          href="/"
          aria-label="Back to the site"
          title="Back to the site"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-parchment"
        >
          <Icon name="arrow_back" size={20} />
        </Link>
        <Link href="/" aria-label="Vidhata home" className="text-ink">
          <BrandLogo size="xl" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-12">
        <div className="w-full max-w-[26rem]">
          <nav
            aria-label="Choose portal"
            className="grid grid-cols-2 rounded-full bg-parchment p-1"
          >
            {PORTALS.map((p) => {
              const active = p.key === portal;
              return (
                <Link
                  key={p.key}
                  href={p.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full py-2.5 text-center text-body font-medium transition-colors",
                    active
                      ? "bg-ink text-paper"
                      : "text-muted-fg hover:text-ink",
                  )}
                >
                  {p.label}
                </Link>
              );
            })}
          </nav>

          <h1 className="mt-8 font-display text-h1 text-ink">{title}</h1>
          {intro && <p className="mt-2 text-body text-muted-fg">{intro}</p>}

          <div className="mt-8">{children}</div>

          {footer && (
            <div className="mt-8 text-center text-body text-muted-fg">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
