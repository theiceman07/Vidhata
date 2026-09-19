"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { DEMO_USERNAME, DEMO_PASSWORD } from "@/lib/mock/auth.mock";

export default function LawyerLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [barNumber, setBarNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (barNumber === DEMO_USERNAME && password === DEMO_PASSWORD) {
      setError("");
      setRole("lawyer");
      router.push("/queue");
    } else {
      setError("Invalid Bar enrolment number or password.");
    }
  }

  return (
    <AuthSplitLayout
      panelTitle="Advocate sign-in"
      panelDescription="For empanelled advocates only. Review findings, adjudicate and sign off on client documents."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bar-number">Bar enrolment number</Label>
          <Input
            id="bar-number"
            required
            value={barNumber}
            onChange={(e) => setBarNumber(e.target.value)}
            placeholder="admin"
            autoComplete="username"
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
          />
        </div>
        {error && <p className="text-small text-flagged">{error}</p>}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-small text-muted-fg">
        Preview credentials: admin / admin
      </p>
      <p className="mt-2 text-center text-small text-muted-fg">
        New advocate?{" "}
        <button
          type="button"
          onClick={() =>
            toast.info("Invite requests aren't available in this preview.")
          }
          className="font-medium text-brand hover:underline"
        >
          Request an invite
        </button>
      </p>
    </AuthSplitLayout>
  );
}
