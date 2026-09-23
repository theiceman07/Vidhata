"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/shared/auth-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { MOCK_PREVIEW_CREDENTIALS } from "@/lib/mock/auth.mock";

const PREVIEW_MODE = process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1";
const MAX_ATTEMPTS = 5;

const LOCKOUT_SECONDS = 30;

export default function ClientLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;

  function signIn() {
    setError("");
    setRole("client");
    router.push("/documents");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (
      username === MOCK_PREVIEW_CREDENTIALS.username &&
      password === MOCK_PREVIEW_CREDENTIALS.password
    ) {
      signIn();
      return;
    }
    setError("Those details do not match an account.");
    setPassword("");
    // QA 4.6: client-side throttling is a UX measure, not a security
    // control — there is still no attempt tracking, rate limiting or
    // lockout on any server, because there is no server. Real throttling
    // belongs in the post-backend auth layer.
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
        portal="client"
        title="Welcome back."
        intro="For founders and teams whose contracts Vidhata drafts."
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
      portal="client"
      title="Welcome back."
      intro="For founders and teams whose contracts Vidhata drafts."
      footer={
        <>
          New to Vidhata?{" "}
            <button
            type="button"
            onClick={() =>
              toast.info("Sign-up isn't available in this preview.")
            }
            className="text-accent hover:underline"
          >
            Create an account
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="username">Email or username</Label>
          <Input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() =>
                toast.info("Password reset isn't available in this preview.")
              }
              className="text-meta text-muted-fg transition-colors hover:text-ink"
            >
              Forgot password?
            </button>
          </div>
          {/* QA 4.6 investigation: the reported "single-character password
              doesn't register" defect was not reproducible. This is a
              standard controlled input (components/ui/input.tsx forwards
              value/onChange with no length-dependent logic); a 1-character
              value updates state and submits normally in manual testing.
              Most likely explanation: a password-manager overlay
              intercepting a very short value during the original test, not
              an app defect. */}
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        {error && (
          <p
            id="login-error"
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

        <Button type="submit" size="lg" className="w-full" disabled={locked}>
          Sign in
        </Button>

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={signIn}>
          Use the preview workspace
        </Button>
      </form>
    </AuthScreen>
  );
}
