"use client";

import { createContext, useContext } from "react";
import type { ReviewScope } from "@/lib/reviewScope";
import { findingState, type Decidable, type FindingState } from "@/lib/findings";

/**
 * The advocate's re-review scope, for the parts of the workspace that say
 * what a finding or a clause is this round. Null everywhere else: on the
 * client's side, on a first review, and on a settled document.
 */
const ReviewScopeContext = createContext<ReviewScope | null>(null);

export const ReviewScopeProvider = ReviewScopeContext.Provider;

export function useReviewScope(): ReviewScope | null {
  return useContext(ReviewScopeContext);
}

/**
 * True on a Freemium AI draft (status ai_draft): no advocate reviews it, so its findings are never
 * "open" or "undecided", only not reviewed. The workspace sets it; every label of a finding's state
 * reads it through useFindingStateOf.
 */
const UnreviewedContext = createContext(false);

export const UnreviewedProvider = UnreviewedContext.Provider;

export function useUnreviewed(): boolean {
  return useContext(UnreviewedContext);
}

/** A finding's state as this workspace says it: "unreviewed" on an AI draft, else findingState. */
export function useFindingStateOf(): (finding: Decidable) => FindingState {
  const unreviewed = useUnreviewed();
  return (finding) => (unreviewed ? "unreviewed" : findingState(finding));
}
