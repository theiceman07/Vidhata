"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { readBrief, intakeFromReading } from "@/lib/api/brief";
import { createDraftDocument } from "@/lib/api/documents";
import { cn } from "@/lib/utils";

/**
 * The way in: describe the deal in your own words.
 *
 * The brief is kept in sessionStorage and carried forward: from the
 * landing page it survives sign-in and reappears in the dashboard
 * prompt. From the dashboard, Draft a document drafts: the brief is read
 * into intake terms, and if it states everything a draft needs the draft
 * is created there and then and the client lands on its progress. If
 * anything is missing, intake opens with what the brief did state filled
 * in, at the first thing it still needs.
 *
 * Motion (after Granola): while the box has focus a thin ring of the
 * brand's greens and amber travels round its border and the box lifts a
 * little; the send button fills once there is something to send. The
 * caret changes colour on each blink. Reduced motion stills all of it.
 * The focus is the box's: the field inside it draws no ring of its own.
 */
export const BRIEF_KEY = "vidhata-brief";

export function DealPrompt({
  className,
  destination,
  placeholder = "Describe the deal: who it is with, what it covers, where it will be signed",
  note = "An advocate signs off before anything reaches you",
  restore = false,
  autoFocus = false,
}: {
  className?: string;
  /**
   * "draft" from inside the portal. From the public site, the route that
   * comes first (sign-in), with the brief kept for after it.
   */
  destination: "draft" | string;
  placeholder?: string;
  note?: string;
  /** Pick up a brief typed before signing in. */
  restore?: boolean;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const ready = brief.trim().length > 0;

  useEffect(() => {
    if (!restore) return;
    try {
      const saved = window.sessionStorage.getItem(BRIEF_KEY);
      if (saved) setBrief(saved);
    } catch {
      // Storage unavailable: start empty.
    }
  }, [restore]);

  function keep(text: string) {
    try {
      window.sessionStorage.setItem(BRIEF_KEY, text);
    } catch {
      // Storage unavailable: carry on without the brief.
    }
  }

  async function start() {
    // Nothing to draft from yet: the box is the next step, not a page.
    if (!ready) {
      fieldRef.current?.focus();
      return;
    }
    if (drafting) return;
    const text = brief.trim();

    if (destination !== "draft") {
      keep(text);
      router.push(destination);
      return;
    }

    setDrafting(true);
    try {
      const intake = intakeFromReading(await readBrief(text));
      if (!intake) {
        keep(text);
        router.push("/new");
        return;
      }
      const doc = await createDraftDocument(intake);
      try {
        window.sessionStorage.removeItem(BRIEF_KEY);
      } catch {
        // Nothing to clear.
      }
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the draft.");
      setDrafting(false);
    }
  }

  return (
    <div className={cn("group relative w-full max-w-2xl", className)}>
      {/* The travelling ring. */}
      <div
        aria-hidden
        className="prompt-ring pointer-events-none absolute -inset-[2px] rounded-[30px] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
        className="relative rounded-modal border border-ink/15 bg-paper p-3 pl-6 text-left transition-[transform,border-color] duration-300 ease-out group-focus-within:-translate-y-0.5 group-focus-within:border-transparent"
      >
        <label htmlFor="deal-brief" className="sr-only">
          Describe the deal
        </label>
        <textarea
          id="deal-brief"
          ref={fieldRef}
          rows={2}
          autoFocus={autoFocus}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start();
            }
          }}
          placeholder={placeholder}
          className="caret-cycle field-bare block w-full resize-none bg-transparent pt-3 text-lead text-ink outline-none placeholder:text-muted-fg"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="hidden text-meta text-muted-fg sm:inline">{note}</span>
          <button
            type="submit"
            aria-label="Draft a document"
            aria-busy={drafting}
            className={cn(
              "ml-auto inline-flex h-12 items-center gap-2 rounded-full px-6 text-body font-medium transition-all duration-300 ease-out",
              ready
                ? "scale-100 bg-accent text-accent-fg hover:bg-accent-hover"
                : "scale-95 bg-ink/[0.06] text-muted-fg",
            )}
          >
            {drafting ? "Drafting…" : "Draft a document"}
            <Icon
              name="arrow_forward"
              size={18}
              className={cn("transition-transform duration-300", ready && "translate-x-0.5")}
            />
          </button>
        </div>
      </form>
    </div>
  );
}
