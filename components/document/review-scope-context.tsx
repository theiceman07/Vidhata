"use client";

import { createContext, useContext } from "react";
import type { ReviewScope } from "@/lib/reviewScope";

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
