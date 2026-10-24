"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Input } from "@/components/ui/input";
import {
  CONTRACT_CATALOGUE,
  CONTRACT_GROUPS,
} from "@/lib/mock/intake-options.mock";
import type { ModelledContractType } from "@/lib/types";
import { cn } from "@/lib/utils";

type DraftType = ModelledContractType;

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
  const [query, setQuery] = useState("");
  // Opens on what can be drafted today; the types still to come are one click away.
  const [availableOnly, setAvailableOnly] = useState(true);
  const needle = query.trim().toLowerCase();
  const shown = CONTRACT_CATALOGUE.filter(
    (e) =>
      (!availableOnly || e.available) && (needle === "" || e.label.toLowerCase().includes(needle)),
  );

  return (
    <div role="group" aria-label="Contract type" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-[3]">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-fg"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agreement types"
            aria-label="Search agreement types"
            className="h-12 pl-10"
          />
        </div>
        <div className="flex h-12 min-w-0 basis-full gap-1 rounded-full bg-parchment p-1 sm:flex-1 sm:basis-auto" role="group" aria-label="Show">
          {[
            { label: "Available now", only: true },
            { label: "All types", only: false },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={availableOnly === f.only}
              onClick={() => setAvailableOnly(f.only)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-full px-3.5 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                availableOnly === f.only ? "bg-paper font-medium text-ink" : "text-muted-fg hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <p className="rounded-control bg-parchment px-4 py-3 text-meta text-muted-fg">
          No agreement type matches that search.
        </p>
      )}

      {CONTRACT_GROUPS.map((group) => {
        // What can be drafted first, then what is coming, in the one grid.
        const entries = [
          ...shown.filter((e) => e.group === group.id && e.available),
          ...shown.filter((e) => e.group === group.id && !e.available),
        ];
        if (entries.length === 0) return null;
        const availableCount = entries.filter((e) => e.available).length;
        return (
          <section key={group.id} aria-labelledby={`contract-group-${group.id}`}>
            <h3
              id={`contract-group-${group.id}`}
              className="text-label font-medium text-muted-fg"
            >
              {group.label}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {entries.map((entry, index) => {
                const selected = entry.available && entry.draftType === value;
                return (
                  <Fragment key={entry.id}>
                    {/* An odd number of available types leaves a gap, so the types still to
                        come begin on a row of their own. */}
                    {index === availableCount && availableCount % 2 === 1 && (
                      <div aria-hidden className="hidden sm:block" />
                    )}
                  <button
                    type="button"
                    disabled={!entry.available}
                    aria-pressed={selected}
                    onClick={() => {
                      if (entry.available) onChange(entry.draftType);
                    }}
                    className={cn(
                      "flex min-h-16 w-full items-center justify-between gap-3 rounded-control border px-5 py-3 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      selected
                        ? "border-accent bg-accent/10 font-medium text-ink"
                        : entry.available
                          ? "border-line bg-paper text-ink hover:border-accent/50 hover:bg-accent/5"
                          : "cursor-not-allowed border-transparent bg-parchment text-muted-fg",
                    )}
                  >
                    <span className="min-w-0">{entry.label}</span>
                    {selected && (
                      <Icon name="check" size={18} className="shrink-0 text-accent" />
                    )}
                    {!entry.available && (
                      <span className="shrink-0 rounded-full bg-paper px-2.5 py-0.5 text-label text-muted-fg">
                        Coming soon
                      </span>
                    )}
                  </button>
                  </Fragment>
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
