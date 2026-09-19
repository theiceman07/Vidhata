"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";

const CONFLICT_LIST = ["Kavach Robotics Pvt Ltd", "Sundargarh Logistics Pvt Ltd"];

export default function ProfilePage() {
  const [available, setAvailable] = useState(true);

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

      <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink">Available for new claims</p>
            <p className="text-small text-muted-fg">
              Turn this off when you don&apos;t want new documents to appear
              in your queue.
            </p>
          </div>
          <Switch
            checked={available}
            onCheckedChange={setAvailable}
            aria-label="Available for new claims"
          />
        </div>
      </section>

      <section className="rounded-card border border-line bg-paper p-5 shadow-card">
        <p className="mb-3 font-medium text-ink">Declared conflicts</p>
        {CONFLICT_LIST.length === 0 ? (
          <p className="text-small text-muted-fg">No conflicts declared.</p>
        ) : (
          <ul className="space-y-1">
            {CONFLICT_LIST.map((name) => (
              <li key={name} className="text-body text-ink">
                {name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
