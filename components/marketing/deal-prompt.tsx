"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createReentryGuard, runExclusive } from "@/lib/reentry";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { readBrief, intakeFromReading } from "@/lib/api/brief";
import { createClientDraft } from "@/lib/api/client/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
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
 * On the landing page it is the larger form: two lines to start, lead
 * type, and example briefs underneath that fill the box when chosen.
 * Inside the portal it is `compact`.
 *
 * Motion (after Granola): while the box has focus a thin ring of the
 * brand's greens and amber travels round its border and the box lifts a
 * little; the send button fills once there is something to send, and the
 * note gives way to how to send it. The
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
  compact = false,
  examples,
}: {
  className?: string;
  /** Briefs a visitor can start from. Choosing one fills the box; nothing is sent. */
  examples?: readonly string[];
  /** One line that grows with the brief, for inside the portal where the box is not the page. */
  compact?: boolean;
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

  const fieldId = useId();
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const ready = brief.trim().length > 0;

  // The field grows to fit the brief, up to a limit. Compact starts at one
  // line; on the landing page it starts at two, so it reads as a place to
  // describe a deal and not a search box.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, compact ? 160 : 240)}px`;
  }, [brief, compact]);

  useEffect(() => {
    if (!restore) return;
    try {
      const saved = window.sessionStorage.getItem(BRIEF_KEY);
      if (saved) setBrief(saved);
    } catch {
      // Storage unavailable: start empty.
    }
  }, [restore]);

  const entry = useRef(createReentryGuard());

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

    // One draft per press. `drafting` is state and two presses in the same tick both read it as
    // false, so the guard is a ref: the second press is dropped, with no request and no draft.
    await runExclusive(entry.current, async () => {
      setDrafting(true);
      try {
        const intake = intakeFromReading(await readBrief(text));
        if (!intake) {
          keep(text);
          router.push("/new");
          return;
        }
        const doc = await createClientDraft(MOCK_CLIENT_ORG.id, intake);
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
    });
  }

  return (
    <div className={cn("group relative w-full max-w-4xl", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
        className={cn(
          "relative border bg-paper text-left transition-[transform,border-color] duration-300 ease-out group-focus-within:-translate-y-0.5 group-focus-within:border-ink/50",
          compact ? "rounded-card border-ink/15 px-4 py-3" : "rounded-modal border-ink/25 px-6 pb-4 pt-5",
        )}
      >
        <label htmlFor={fieldId} className="sr-only">
          Describe the deal
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          rows={compact ? 1 : 2}
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
          className={cn(
            "caret-cycle field-bare block w-full resize-none bg-transparent text-ink outline-none placeholder:text-muted-fg",
            "tracking-normal",
            compact ? "pt-0.5 text-body" : "text-lead",
          )}
        />
        <div className={cn("flex items-center justify-between gap-3", compact ? "mt-2" : "mt-3")}>
          {/* The note until there is a brief, then how to send it. */}
          <span className={cn("hidden text-muted-fg tracking-normal sm:inline", compact ? "text-label" : "text-meta")}>
            {ready ? "Enter to draft · Shift+Enter for a new line" : note}
          </span>
          <button
            type="submit"
            aria-label="Draft a document"
            aria-busy={drafting}
            className={cn(
              compact ? "h-8 px-4 text-meta" : "h-11 px-5 text-body",
              "ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,transform] duration-300 ease-out active:scale-[0.96]",
              // Neutral until there is something to send, never a tint of
              // the accent: that reads lavender, and as a disabled control.
              ready
                ? "bg-accent text-accent-fg hover:bg-accent-hover"
                : "bg-ink/[0.07] text-ink hover:bg-ink/[0.12]",
            )}
          >
            {drafting ? "Drafting…" : "Draft a document"}
            <Icon
              name="arrow_forward"
              size={16}
              className={cn("transition-transform duration-300", ready && "translate-x-0.5")}
            />
          </button>
        </div>
      </form>
      {examples && examples.length > 0 && (
        <ul aria-label="Example briefs" className="mt-4 flex flex-wrap justify-center gap-2">
          {examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => {
                  setBrief(example);
                  fieldRef.current?.focus();
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-ink/15 bg-paper px-4 text-left text-meta text-ink transition-[background-color,border-color,transform] duration-150 ease-out hover:border-ink/40 hover:bg-parchment active:scale-[0.96]"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
