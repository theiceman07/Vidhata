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

export default function ClientLoginPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      setError("");
      setRole("client");
      router.push("/dashboard");
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <AuthSplitLayout
      panelTitle="Welcome back"
      panelDescription="Sign in to track your documents, review findings and download your execution checklist."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
