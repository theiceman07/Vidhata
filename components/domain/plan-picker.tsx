"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { freemiumRemaining } from "@/lib/api/client/documents";
import { plansFor } from "@/lib/config/plans";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ModelledContractType, PlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The last intake step: the plan, from those that cover the agreement type (lib/config/plans.ts).
 * The client chooses it before anything is drafted, so they know the price up front.
 *
 * Freemium says plainly that no advocate reviews or signs it, and it is offered only while the
 * organisation has a Freemium contract left this month.
 */
export function PlanPicker({
  type,
  value,
  onChange,
  error,
}: {
  type: ModelledContractType;
  value: PlanId | undefined;
  onChange: (plan: PlanId) => void;
  error?: string;
}) {
  const plans = plansFor(type);
  const [freeLeft, setFreeLeft] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    freemiumRemaining(MOCK_CLIENT_ORG.id).then((n) => live && setFreeLeft(n));
    return () => {
      live = false;
    };
  }, []);

  return (
    <fieldset aria-describedby={error ? "plan-error" : undefined}>
      <legend className="font-display text-h2 text-ink">Choose a plan</legend>
      <p className="mt-2 max-w-measure text-body text-muted-fg">
        {plans.length === 1
          ? `This agreement is covered by the ${plans[0].label} plan.`
          : "These plans cover this agreement. The plan sets the price and whether an advocate reviews it."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const usedUp = plan.id === "freemium" && freeLeft === 0;
          const selected = value === plan.id;
          return (
            <label
              key={plan.id}
              className={cn(
                "relative flex cursor-pointer flex-col rounded-card border bg-paper p-6 transition-colors",
                selected ? "border-ink" : "border-line hover:border-ink/40",
                usedUp && "cursor-not-allowed opacity-60 hover:border-line",
              )}
            >
              <input
                type="radio"
                name="plan"
                value={plan.id}
                checked={selected}
                disabled={usedUp}
                onChange={() => onChange(plan.id)}
                className="peer sr-only"
              />
              <span className="flex items-start justify-between gap-4">
                <span className="text-lead font-medium text-ink">{plan.label}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-done bg-done text-paper" : "border-line",
                  )}
                >
                  {selected && <Icon name="check" size={16} />}
                </span>
              </span>
              <span className="mt-3 font-display text-h1 text-ink">{plan.price}</span>
              <span className="text-meta text-muted-fg">{plan.per}</span>
              <span className="mt-4 space-y-1 text-meta text-ink">
                {plan.includes.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Icon name="check" size={16} />
                    {item}
                  </span>
                ))}
                {!plan.advocateReview && (
                  <span className="flex items-center gap-2 text-muted-fg">
                    <Icon name="remove" size={16} />
                    No advocate review or sign-off
                  </span>
                )}
              </span>
              {plan.id === "freemium" && freeLeft !== null && (
                <span className="mt-4 text-meta text-muted-fg">
                  {usedUp ? "This month's free contract is used." : `${freeLeft} free contract left this month.`}
                </span>
              )}
              <span className="pointer-events-none absolute inset-0 rounded-card peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
            </label>
          );
        })}
      </div>

      {error && (
        <p id="plan-error" role="alert" className="mt-4 text-small text-ink">
          {error}
        </p>
      )}
      <p className="mt-6 max-w-measure text-meta text-muted-fg">
        On a plan with an advocate you pay once the document is screened, and nothing reaches an
        advocate before then. Preview: no payment is taken.
      </p>
    </fieldset>
  );
}
