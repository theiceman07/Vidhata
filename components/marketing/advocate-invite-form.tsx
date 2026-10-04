"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRACTICE_AREAS,
  inviteProblems,
  requestAdvocateInvite,
  type InviteProblems,
  type PracticeArea,
} from "@/lib/api/advocate-invite";

type SendState = "idle" | "sending" | "sent" | "error";

/**
 * A request to be invited onto the panel. It is a request and nothing more:
 * empanelment is by invitation, so the form never says the advocate has
 * applied for a place, and in the preview it never sends anything and says so.
 */
export function AdvocateInviteForm() {
  const [name, setName] = useState("");
  const [bar, setBar] = useState("");
  const [council, setCouncil] = useState("");
  const [areas, setAreas] = useState<PracticeArea[]>([]);
  const [email, setEmail] = useState("");
  const [problems, setProblems] = useState<InviteProblems>({});
  const [state, setState] = useState<SendState>("idle");

  const request = {
    name,
    barEnrolmentNumber: bar,
    stateBarCouncil: council,
    practiceAreas: areas,
    email,
  };

  function toggle(area: PracticeArea, on: boolean) {
    setAreas((current) =>
      on ? [...current, area] : current.filter((a) => a !== area),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = inviteProblems(request);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setState("sending");
    try {
      await requestAdvocateInvite(request);
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-card bg-parchment p-6">
        <p className="font-display text-h3 text-ink">Thank you, {name.trim()}.</p>
        <p className="mt-2 max-w-measure text-body text-ink">
          Your request is noted. Empanelment is by invitation, so there is nothing more for you to
          do: if a place on the panel opens for you, the invitation is sent to {email.trim()}.
        </p>
        <p className="mt-2 text-body text-muted-fg">
          This is a preview, so your request was not sent and nothing was saved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-card bg-parchment p-6">
      <Field id="invite-name" label="Your name" error={problems.name}>
        <Input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          aria-invalid={Boolean(problems.name)}
          aria-describedby={problems.name ? "invite-name-error" : undefined}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="invite-bar" label="Bar enrolment number" error={problems.barEnrolmentNumber}>
          <Input
            id="invite-bar"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            required
            aria-invalid={Boolean(problems.barEnrolmentNumber)}
            aria-describedby={problems.barEnrolmentNumber ? "invite-bar-error" : undefined}
          />
        </Field>
        <Field id="invite-council" label="State Bar Council" error={problems.stateBarCouncil}>
          <Input
            id="invite-council"
            value={council}
            onChange={(e) => setCouncil(e.target.value)}
            placeholder="The council you are enrolled with"
            required
            aria-invalid={Boolean(problems.stateBarCouncil)}
            aria-describedby={problems.stateBarCouncil ? "invite-council-error" : undefined}
          />
        </Field>
      </div>

      <fieldset aria-describedby={problems.practiceAreas ? "invite-areas-error" : undefined}>
        <legend className="text-label font-medium text-ink">Areas you practise in</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PRACTICE_AREAS.map((area) => {
            const id = `invite-area-${area.toLowerCase().replace(/[^a-z]+/g, "-")}`;
            return (
              <div key={area} className="flex items-center gap-3">
                <Checkbox
                  id={id}
                  checked={areas.includes(area)}
                  onCheckedChange={(v) => toggle(area, v === true)}
                />
                <label htmlFor={id} className="text-body text-ink">
                  {area}
                </label>
              </div>
            );
          })}
        </div>
        {problems.practiceAreas && (
          <p id="invite-areas-error" role="alert" className="mt-2 text-small text-flagged">
            {problems.practiceAreas}
          </p>
        )}
      </fieldset>

      <Field id="invite-email" label="Email" error={problems.email}>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          aria-invalid={Boolean(problems.email)}
          aria-describedby={problems.email ? "invite-email-error" : undefined}
        />
      </Field>

      {state === "error" && (
        <p role="alert" className="text-small text-flagged">
          Could not send your request. Try again.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-label text-muted-fg">
          Preview. Requests are not sent and nothing is saved.
        </p>
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request an invitation"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-small text-flagged">
          {error}
        </p>
      )}
    </div>
  );
}
