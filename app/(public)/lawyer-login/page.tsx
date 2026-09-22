"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { MOCK_PREVIEW_CREDENTIALS } from "@/lib/mock/auth.mock";

const PREVIEW_MODE = process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1";
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function LawyerLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [barNumber, setBarNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (
      barNumber === MOCK_PREVIEW_CREDENTIALS.username &&
      password === MOCK_PREVIEW_CREDENTIALS.password
    ) {
      setError("");
      // QA 10.2: setRole runs before navigation and overwrites any stale
      // "client" role left in storage, so this always lands on /queue —
      // the discoverability half of that report (Client login sitting
      // prominently in the header while Advocate login was buried in the
      // footer) is fixed on the landing page nav instead.
      setRole("lawyer");
      router.push("/queue");
      return;
    }
    setError("Invalid Bar enrolment number or password.");
    setPassword("");
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
      setAttempts(0);
    }
  }

  if (!PREVIEW_MODE) {
    return (
      <AuthSplitLayout
        panelTitle="Advocate sign-in"
        panelDescription="For empanelled advocates only. Review findings, adjudicate and sign off on client documents."
      >
        <p className="text-body text-muted-fg">
          Sign-in is not yet available. Vidhata does not have a production
          identity provider connected in this environment.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/">Go to home</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      panelTitle="Advocate sign-in"
      panelDescription="For empanelled advocates only. Review findings, adjudicate and sign off on client documents."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="bar-number">Bar enrolment number</Label>
          <Input
            id="bar-number"
            required
            value={barNumber}
            onChange={(e) => setBarNumber(e.target.value)}
            autoComplete="username"
            aria-describedby={error ? "lawyer-login-error" : undefined}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-describedby={error ? "lawyer-login-error" : undefined}
          />
        </div>
        {error && (
          <p
            id="lawyer-login-error"
            role="alert"
            aria-live="polite"
            className="text-small text-flagged"
          >
            {error}
          </p>
        )}
        {locked && (
          <p role="alert" aria-live="polite" className="text-small text-caution-fg">
            Too many attempts. Try again in {LOCKOUT_SECONDS} seconds.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={locked}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-small text-muted-fg">
        Demo preview — not a real account. Preview credentials:{" "}
        {MOCK_PREVIEW_CREDENTIALS.username} / {MOCK_PREVIEW_CREDENTIALS.password}
      </p>
      <p className="mt-2 text-center text-small text-muted-fg">
        New advocate?{" "}
        <button
          type="button"
          onClick={() =>
            toast.info("Invite requests aren't available in this preview.")
          }
          className="font-medium text-accent hover:underline"
        >
          Request an invite
        </button>
      </p>
    </AuthSplitLayout>
  );
}
