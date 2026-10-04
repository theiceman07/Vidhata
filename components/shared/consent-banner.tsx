"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  consentStatement,
  readConsent,
  serialiseConsent,
  type ConsentChoice,
} from "@/lib/config/consent";

const STORAGE_KEY = "vidhata-preview-consent";

/**
 * Asks, once, whether non-essential cookies may run, and says honestly that
 * the preview has none. Declining is the default: until someone answers, and
 * for anyone who ignores it, nothing non-essential runs. It sits at the foot
 * of the page without covering it or taking focus, and it is marked for
 * revision in lib/config/consent.ts for the day analytics or another tool is
 * added.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(readConsent(window.localStorage.getItem(STORAGE_KEY)) === null);
    } catch {
      // Storage unavailable: ask each time rather than guess.
      setOpen(true);
    }
  }, []);

  function answer(choice: ConsentChoice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialiseConsent(choice, Date.now()));
    } catch {
      // The answer holds for this page only.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <section
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-card bg-ink p-5 text-paper sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[24rem] print:hidden"
    >
      <p className="text-meta text-paper">{consentStatement()}</p>
      <p className="mt-2 text-label text-paper/70">
        <Link href="/privacy" className="underline underline-offset-2 hover:no-underline">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-paper text-ink hover:bg-parchment"
          onClick={() => answer("declined")}
        >
          Decline non-essential
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-paper hover:bg-paper/10 hover:text-paper"
          onClick={() => answer("accepted")}
        >
          Accept non-essential
        </Button>
      </div>
    </section>
  );
}
