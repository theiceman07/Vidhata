"use client";

import { Icon } from "@/components/shared/icon";
import {
  CONTRACT_CATALOGUE,
  CONTRACT_GROUPS,
} from "@/lib/mock/intake-options.mock";
import type { ClientDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

type DraftType = ClientDocument["type"];

/**
 * The first thing intake asks: what kind of document is this.
 *
 * Every type in the catalogue is shown, in its group, so a client can see
 * what Vidhata will draft and what it will not yet. A type that cannot be
 * drafted is disabled and says "Coming soon" rather than being left out, so
 * its absence is never a mystery. Which types are available is one flag per
 * type in the catalogue, not a decision made here.
 */
export function ContractTypePicker({
  value,
  onChange,
  error,
}: {
  value: DraftType | undefined;
  onChange: (type: DraftType) => void;
  error?: string;
}) {
  return (
    <div role="group" aria-labelledby="contract-type-heading" className="space-y-8">
      <div>
        <h2 id="contract-type-heading" className="font-display text-h3 text-ink">
          Contract type
        </h2>
        <p className="mt-1 text-meta text-muted-fg">
          Choose what you are drafting. Types marked coming soon are not
          available yet.
        </p>
      </div>

      {CONTRACT_GROUPS.map((group) => {
        const entries = CONTRACT_CATALOGUE.filter((e) => e.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`contract-group-${group.id}`}>
            <h3
              id={`contract-group-${group.id}`}
              className="text-label font-medium text-muted-fg"
            >
              {group.label}
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {entries.map((entry) => {
                const selected = entry.available && entry.draftType === value;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={!entry.available}
                    aria-pressed={selected}
                    onClick={() => {
                      if (entry.available) onChange(entry.draftType);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 rounded-control border px-4 py-3 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      selected
                        ? "border-accent bg-parchment text-ink"
                        : entry.available
                          ? "border-line bg-paper text-ink hover:bg-parchment"
                          : "cursor-not-allowed border-line bg-parchment text-muted-fg",
                    )}
                  >
                    <span>{entry.label}</span>
                    {selected && (
                      <Icon name="check" size={18} className="shrink-0 text-accent" />
                    )}
                    {!entry.available && (
                      <span className="shrink-0 rounded-full bg-paper px-2.5 py-0.5 text-label text-muted-fg">
                        Coming soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {error && (
        <p role="alert" className="text-small text-flagged">
          {error}
        </p>
      )}
    </div>
  );
}
