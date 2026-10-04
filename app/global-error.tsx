"use client";

import "./globals.css";
import { FONT_VARIABLES } from "./fonts";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";

// When the root layout itself fails, app/error.tsx cannot render, because it
// sits inside that layout. This replaces the whole document, so it carries
// its own <html> and <body> and brings its own fonts and styles. It uses
// nothing that needs a provider (no session, no router, no toaster): a plain
// link home does a full load, which is what a broken page needs, so the two
// anchors below stay plain <a> elements.
/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`}>
      <head>
        <title>Something went wrong · Vidhata</title>
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <header className="mx-auto w-full max-w-6xl px-6 pt-10">
          <a href="/" aria-label="Vidhata home" className="inline-block text-ink">
            <BrandLogo size="xl" />
          </a>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-12">
          <div className="w-full max-w-[26rem]">
            <h1 className="font-display text-h1 text-ink">Something went wrong</h1>
            <p className="mt-3 text-body text-muted-fg">
              The page could not be shown. You can try again, or go back to the start.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => reset()}>
                Try again
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/">Back to the start</a>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
