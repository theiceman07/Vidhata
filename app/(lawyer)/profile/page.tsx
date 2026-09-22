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
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" description="Empanelment, conflicts and availability." />

      <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-h3 text-ink">
              {CURRENT_ADVOCATE.name}
            </p>
            <p className="text-small text-muted-fg">
              Bar enrolment: {CURRENT_ADVOCATE.bar}
            </p>
          </div>
          <Badge className="bg-verified/15 text-verified hover:bg-verified/15">
            Empanelled
          </Badge>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">Available for new claims</p>
                <p className="text-small text-muted-fg">
                  Turn this off when you don&apos;t want new documents to
                  appear claimable in the queue.
                </p>
              </div>
              <Switch
                checked={available}
                onCheckedChange={handleAvailabilityChange}
                aria-label="Available for new claims"
              />
            </div>
          </section>

          <section className="rounded-card border border-line bg-paper p-5 shadow-card">
            <p className="mb-3 font-medium text-ink">Declared conflicts</p>
            {conflicts.length === 0 ? (
              <p className="mb-3 text-small text-muted-fg">
                No conflicts declared.
              </p>
            ) : (
              <ul className="mb-3 space-y-1">
                {conflicts.map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 text-body text-ink"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveConflict(name)}
                      aria-label={`Remove declared conflict: ${name}`}
                      className="text-muted-fg hover:text-flagged"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddConflict} className="flex gap-2">
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
        </>
      )}
    </div>
  );
}
