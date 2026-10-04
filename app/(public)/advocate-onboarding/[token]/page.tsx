"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthScreen } from "@/components/shared/auth-screen";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MIN_PASSWORD_LENGTH,
  completeOnboarding,
  getInvite,
  onboardingProblems,
  type InviteLookup,
} from "@/lib/api/onboarding";
import { useSession } from "@/lib/session";
import type { Invitation } from "@/lib/mock/invites.mock";

const PREVIEW_MODE = process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1";
const STEPS = ["Welcome", "Password", "Your enrolment", "Conflicts"] as const;

type Load =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; lookup: InviteLookup };

/**
 * Accepting an invitation to the panel.
 *
 * Empanelment is by invitation, so this is reached only from a link that
 * carries one. Four steps: welcome, a password (a stand-in; nothing here
 * handles a real credential), confirming Bar enrolment details, and declaring
 * conflicts, which are the names a claim is checked against. It ends at the
 * queue. Nothing here assigns an advocate a document: they claim what they
 * choose.
 *
 * It says only what the documents support about empanelment. The terms are
 * not stated, and the page says so rather than guessing at them.
 */
export default function OnboardingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { setRole } = useSession();
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [step, setStep] = useState(0);

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [bar, setBar] = useState("");
  const [council, setCouncil] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [newConflict, setNewConflict] = useState("");
  const [none, setNone] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    setLoad({ phase: "loading" });
    try {
      const lookup = await getInvite(params.token);
      if (lookup.state === "valid") {
        setBar(lookup.invitation.barEnrolmentNumber);
        setCouncil(lookup.invitation.stateBarCouncil);
      }
      setLoad({ phase: "loaded", lookup });
    } catch (err) {
      setLoad({
        phase: "error",
        message: err instanceof Error ? err.message : "Could not check your invitation.",
      });
    }
  }, [params.token]);

  useEffect(() => {
    check();
  }, [check]);

  if (!PREVIEW_MODE) {
    return (
      <AuthScreen portal="advocate" title="Join the panel." intro="By invitation only.">
        <p className="text-body text-ink">
          Accounts aren&apos;t open yet. Vidhata is in preview, so an invitation can&apos;t be
          accepted here.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </AuthScreen>
    );
  }

  if (load.phase === "loading") {
    return (
      <AuthScreen portal="advocate" title="Join the panel." intro="Checking your invitation.">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-2/3" />
      </AuthScreen>
    );
  }

  if (load.phase === "error") {
    return (
      <AuthScreen portal="advocate" title="Join the panel." intro="By invitation only.">
        <p role="alert" className="text-body text-flagged">
          {load.message}
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={check}>
          Try again
        </Button>
      </AuthScreen>
    );
  }

  const { lookup } = load;
  if (lookup.state !== "valid") {
    return <Unusable state={lookup.state} />;
  }
  const invitation: Invitation = lookup.invitation;

  function input() {
    return {
      password,
      passwordRepeat,
      barEnrolmentNumber: bar,
      stateBarCouncil: council,
      detailsConfirmed: confirmed,
      declaredConflicts: conflicts,
      noConflictsToDeclare: none,
    };
  }

  // The first thing wrong with what this step asks for, or null.
  function stepProblem(at: number): string | null {
    const problems = onboardingProblems(input());
    if (at === 1) return problems.find((p) => /password/i.test(p)) ?? null;
    if (at === 2) return problems.find((p) => /enrolment/i.test(p)) ?? null;
    if (at === 3) return problems.find((p) => /conflict/i.test(p)) ?? null;
    return null;
  }

  function next() {
    const found = stepProblem(step);
    setProblem(found);
    if (!found) setStep((s) => s + 1);
  }

  function addConflict() {
    const name = newConflict.trim();
    if (name && !conflicts.includes(name)) setConflicts([...conflicts, name]);
    setNewConflict("");
    setNone(false);
  }

  async function finish() {
    const found = stepProblem(3);
    setProblem(found);
    if (found || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await completeOnboarding(params.token, input());
      setRole("lawyer");
      toast.success("You have joined the panel. Documents are the ones you claim from the queue.");
      router.push("/queue");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not complete your onboarding.");
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <AuthScreen
      portal="advocate"
      title={`Welcome, ${invitation.name}.`}
      intro={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
    >
      <div className="space-y-5">
        {step === 0 && (
          <div className="space-y-3 text-body text-ink">
            <p>You have been invited to join Vidhata&apos;s panel of advocates.</p>
            <p className="text-muted-fg">
              Your profile is private to you and Vidhata. Clients cannot search, rank or rate
              advocates.
            </p>
            <p className="text-muted-fg">
              Documents are not assigned to you. You claim them from the queue, and each time you
              declare no conflict with either party.
            </p>
            <p className="text-muted-fg">
              The terms of empanelment are not stated here. They are provided separately, and
              counsel is confirming that wording.
            </p>
          </div>
        )}

        {step === 1 && (
          <>
            <p className="text-meta text-muted-fg">
              This is a stand-in for the preview: nothing here is stored or checked beyond its
              length.
            </p>
            <div>
              <Label htmlFor="onboarding-password">Password</Label>
              <PasswordInput
                id="onboarding-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="onboarding-password-note"
              />
              <p id="onboarding-password-note" className="mt-1.5 text-label text-muted-fg">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>
            <div>
              <Label htmlFor="onboarding-password-repeat">Repeat the password</Label>
              <PasswordInput
                id="onboarding-password-repeat"
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-meta text-muted-fg">
              These come from your invitation. Correct them if they are wrong, then confirm.
            </p>
            <div>
              <Label htmlFor="onboarding-bar">Bar enrolment number</Label>
              <Input id="onboarding-bar" value={bar} onChange={(e) => setBar(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="onboarding-council">State Bar Council</Label>
              <Input
                id="onboarding-council"
                value={council}
                onChange={(e) => setCouncil(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="onboarding-confirm"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-1"
              />
              <label htmlFor="onboarding-confirm" className="text-body text-ink">
                These enrolment details are correct.
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-meta text-muted-fg">
              Name any person or company you have a conflict with. A document whose client or
              counterparty matches one of them cannot be claimed by you. You can change this on
              your profile.
            </p>
            <div className="flex gap-2">
              <Input
                aria-label="A name you have a conflict with"
                value={newConflict}
                onChange={(e) => setNewConflict(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addConflict();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addConflict}>
                Add
              </Button>
            </div>
            {conflicts.length > 0 && (
              <ul className="space-y-1.5">
                {conflicts.map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-control bg-parchment px-3 py-2 text-meta text-ink"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => setConflicts(conflicts.filter((c) => c !== name))}
                      aria-label={`Remove ${name}`}
                      className="text-muted-fg hover:text-ink"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id="onboarding-none"
                checked={none}
                onCheckedChange={(v) => {
                  setNone(v === true);
                  if (v === true) setConflicts([]);
                }}
                className="mt-1"
              />
              <label htmlFor="onboarding-none" className="text-body text-ink">
                I have no conflicts to declare now.
              </label>
            </div>
          </>
        )}

        {problem && (
          <p role="alert" className="text-small text-flagged">
            {problem}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setProblem(null);
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0 || submitting}
          >
            Back
          </Button>
          {last ? (
            <Button type="button" onClick={finish} disabled={submitting}>
              {submitting ? "Joining" : "Finish and go to the queue"}
            </Button>
          ) : (
            <Button type="button" onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </AuthScreen>
  );
}

function Unusable({ state }: { state: "expired" | "used" | "invalid" }) {
  const copy = {
    invalid: {
      title: "This invitation is not valid.",
      body: "Open the whole link from your invitation. If you do not have one, empanelment is by invitation only.",
      href: "/advocate-login",
      link: "Advocate sign-in",
    },
    expired: {
      title: "This invitation has expired.",
      body: "Empanelment is by invitation, so you will need a new one.",
      href: "/advocate-invite",
      link: "Request an invitation",
    },
    used: {
      title: "This invitation has already been used.",
      body: "If you have joined the panel, sign in.",
      href: "/advocate-login",
      link: "Advocate sign-in",
    },
  }[state];

  return (
    <AuthScreen portal="advocate" title={copy.title} intro="By invitation only.">
      <p className="text-body text-ink">{copy.body}</p>
      <Button asChild className="mt-6 w-full">
        <Link href={copy.href}>{copy.link}</Link>
      </Button>
    </AuthScreen>
  );
}
