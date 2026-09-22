"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/shared/auth-screen";
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

  function signIn() {
    setError("");
    // QA 10.2: setRole runs before navigation and overwrites any stale
    // "client" role left in storage, so this always lands on /queue.
    setRole("lawyer");
    router.push("/queue");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (
      barNumber === MOCK_PREVIEW_CREDENTIALS.username &&
      password === MOCK_PREVIEW_CREDENTIALS.password
    ) {
      signIn();
      return;
    }
    setError("Those details do not match an empanelled advocate.");
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
      <AuthScreen
        title="Advocate sign in."
        intro="For empanelled advocates only."
      >
        <p className="text-body text-ink">
          Sign-in is not yet available. Vidhata does not have a production
          identity provider connected in this environment.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Go to home</Link>
        </Button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Advocate sign in."
      intro="For empanelled advocates only."
      footer={
        <>
          <button
            type="button"
            onClick={() =>
              toast.info("Invite requests aren't available in this preview.")
            }
            className="text-accent hover:underline"
          >
            Request an invite
          </button>
          <span className="mx-2 text-line">·</span>
          <Link href="/login" className="hover:text-ink">
            Client sign in
          </Link>
        </>
      }
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
            aria-describedby={error ? "advocate-login-error" : undefined}
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
            aria-describedby={error ? "advocate-login-error" : undefined}
          />
        </div>

        {error && (
          <p
            id="advocate-login-error"
            role="alert"
            aria-live="polite"
            className="text-small text-flagged"
          >
            {error}
          </p>
        )}
        {locked && (
          <p
            role="alert"
            aria-live="polite"
            className="text-small text-caution-fg"
          >
            Too many attempts. Try again in {LOCKOUT_SECONDS} seconds.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={locked}>
          Sign in
        </Button>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              toast.info("Password reset isn't available in this preview.")
            }
            className="text-small text-muted-fg hover:text-ink"
          >
            Forgot password?
          </button>
          <button
            type="button"
            onClick={signIn}
            className="text-small text-accent hover:underline"
          >
            Use the preview workspace
          </button>
        </div>
      </form>
    </AuthScreen>
  );
}
