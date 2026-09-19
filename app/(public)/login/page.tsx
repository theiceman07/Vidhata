"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";

export default function ClientLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRole("client");
    router.push("/dashboard");
  }

  return (
    <AuthSplitLayout
      panelTitle="Welcome back"
      panelDescription="Sign in to track your documents, review findings and download your execution checklist."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
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
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => toast.info("Sign-up isn't available in this preview.")}
          className="font-medium text-brand hover:underline"
        >
          Sign up
        </button>
      </p>
    </AuthSplitLayout>
  );
}
