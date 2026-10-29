"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import {
  getAdvocateProfile,
  setAdvocateAvailability,
  addDeclaredConflict,
  removeDeclaredConflict,
} from "@/lib/api/advocate";

// QA 3.6: this used to be untracked useState with no effect on the queue
// (the toggle updated nothing the routing logic ever read) and a
// permanently empty, unmanageable conflicts list. Both are now backed by
// lib/api/advocate.ts and actually gate the Claim action (see
// app/(lawyer)/queue/page.tsx).
export default function ProfilePage() {
  const [available, setAvailable] = useState(true);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConflict, setNewConflict] = useState("");

  useEffect(() => {
    getAdvocateProfile().then((profile) => {
      setAvailable(profile.available);
      setConflicts(profile.declaredConflicts);
      setLoading(false);
    });
  }, []);

  async function handleAvailabilityChange(next: boolean) {
    setAvailable(next);
    await setAdvocateAvailability(next);
    toast.success(
      next
        ? "You're available for new claims."
        : "You're marked unavailable. New documents will not be offered to you.",
    );
  }

  async function handleAddConflict(e: React.FormEvent) {
    e.preventDefault();
    if (!newConflict.trim()) return;
    const profile = await addDeclaredConflict(newConflict.trim());
    setConflicts(profile.declaredConflicts);
    setNewConflict("");
  }

  async function handleRemoveConflict(name: string) {
    const profile = await removeDeclaredConflict(name);
    setConflicts(profile.declaredConflicts);
  }

  return (
    <div className="w-full">
      <PageHeader title="Profile" description="Empanelment, conflicts and availability." />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-card bg-parchment p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-h3 text-ink">{CURRENT_ADVOCATE.name}</p>
                <p className="mt-1 text-meta text-muted-fg">
                  Bar enrolment: {CURRENT_ADVOCATE.bar}
                </p>
              </div>
              <Badge className="shrink-0 border-transparent bg-done text-white hover:bg-done">
                Empanelled
              </Badge>
            </div>
          </section>

          {loading ? (
            <Skeleton className="h-28 w-full rounded-card" />
          ) : (
            <section className="rounded-card bg-parchment p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="font-medium text-ink">Available for new claims</p>
                  <p className="mt-1 max-w-measure text-meta text-muted-fg">
                    Turn this off when you don&apos;t want new documents to appear claimable in
                    the queue.
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  checked={available}
                  onCheckedChange={handleAvailabilityChange}
                  aria-label="Available for new claims"
                />
              </div>
            </section>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-card" />
        ) : (
          <section className="rounded-card bg-parchment p-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-ink">Declared conflicts</p>
              <p className="text-label tabular-nums text-muted-fg">{conflicts.length}</p>
            </div>
            <p className="mt-1 text-meta text-muted-fg">
              A document naming one of these parties cannot be claimed by you.
            </p>
            {conflicts.length === 0 ? (
              <p className="mt-4 rounded-control border border-dashed border-line px-4 py-3 text-meta text-muted-fg">
                No conflicts declared.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {conflicts.map((name) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 text-meta text-ink"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveConflict(name)}
                      aria-label={`Remove declared conflict: ${name}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-fg hover:bg-sand hover:text-ink"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddConflict} className="mt-4 flex gap-2">
              <Input
                value={newConflict}
                onChange={(e) => setNewConflict(e.target.value)}
                placeholder="Counterparty or client name"
                aria-label="Add a declared conflict"
              />
              <Button type="submit" variant="outline" size="sm">
                Add
              </Button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
