"use client";

import { useState } from "react";
import { resetDemoData } from "@/lib/api/state";
import { backendDataEnabled } from "@/lib/api/source";

/**
 * Says, on every signed-in page, what the preview is: sample data, kept in this
 * browser tab and sent nowhere. It is not dismissible, because a reader who has
 * closed it once can forget they are not looking at a real matter. It takes
 * its own row above the page rather than floating over it, and it does not
 * print.
 *
 * It also holds the way out of a demo gone wrong. The preview keeps what has
 * been done in this tab, so a refresh no longer wipes it; "Reset demo data"
 * puts the sample data back as it started. It asks once, because there is no
 * undoing it.
 */
export function PreviewBanner() {
  const [confirming, setConfirming] = useState(false);

  // With the real backend on, the data is real and is sent, so this notice would be false.
  if (backendDataEnabled()) return null;

  return (
    <aside
      aria-label="Preview notice"
      data-preview-banner
      className="shrink-0 bg-parchment px-4 py-0.5 text-center text-label text-muted-fg print:hidden"
    >
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>
          <span className="font-medium text-ink">Preview.</span> Sample data, kept in this browser
          tab only. Nothing is sent.
        </span>
        {confirming ? (
          <span role="group" aria-label="Confirm reset" className="inline-flex items-center gap-2">
            <span className="text-ink">Put all sample data back as it started?</span>
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex min-h-8 items-center rounded-full bg-ink px-3 font-medium text-paper hover:bg-ink/85"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-8 items-center rounded-full px-2 link"
            >
              Keep it
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-8 items-center link"
          >
            Reset demo data
          </button>
        )}
      </p>
    </aside>
  );
}
