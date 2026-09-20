"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// QA 10.7: same rationale as not-found.tsx — an uncaught render error used
// to leave no route home. error.tsx must be a Client Component per
// Next.js App Router convention; it renders inside the existing root
// layout, so (unlike global-error.tsx) it does not declare its own
// <html>/<body>.
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-h1 text-ink">Something went wrong</p>
      <p className="mt-2 max-w-sm text-body text-muted-fg">
        An unexpected error occurred. You can try again or head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
