"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";

export default function LawyerLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [barNumber, setBarNumber] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRole("lawyer");
    router.push("/queue");
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
            placeholder="MH/2210/2018"
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
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-small text-muted-fg">
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
