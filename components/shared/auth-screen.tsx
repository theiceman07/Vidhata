import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-logo";

/**
 * Sign in. One screen, one surface, one task.
 *
 * The split-screen it replaces was a marketing composition wrapped
 * around a form: a black panel restating the pitch to someone who has
 * already decided to come in. Everything here is the task, centred, on
 * paper.
 */
export function AuthScreen({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  /** One line of context. Optional, and usually enough on its own. */
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="Vidhata home" className="text-ink">
            <BrandMark size={32} />
          </Link>
          <h1 className="mt-6 font-display text-h1 text-ink">{title}</h1>
          {intro && <p className="mt-2 text-meta text-muted-fg">{intro}</p>}
        </div>

        <div className="mt-10">{children}</div>

        {footer && (
          <div className="mt-8 text-center text-meta text-muted-fg">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
