"use client";

import { useState } from "react";
import { signInWithProvider, type SignInProvider } from "@/lib/api/auth";
import { signInProviders } from "@/lib/api/source";
import { cn } from "@/lib/utils";

/**
 * Google and Microsoft sign-in, above the email form on the client sign-in page. Each signs in an
 * existing account; an address with no account comes back to the request-access form (see
 * app/auth/callback). The marks are the providers' own, as their branding rules require, kept as
 * files in public/icons so no colour value sits in a component.
 */
const PROVIDERS: { id: SignInProvider; label: string; mark: string }[] = [
  { id: "google", label: "Continue with Google", mark: "/icons/google.svg" },
  { id: "azure", label: "Continue with Microsoft", mark: "/icons/microsoft.svg" },
];

export function ProviderButtons({ className }: { className?: string }) {
  const [pending, setPending] = useState<SignInProvider | null>(null);
  const [error, setError] = useState("");
  const enabled = signInProviders();

  async function start(provider: SignInProvider) {
    setError("");
    setPending(provider);
    try {
      await signInWithProvider(provider);
      // The browser is leaving for the provider; keep the button busy until it does.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the sign-in provider.");
      setPending(null);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {PROVIDERS.filter((p) => enabled.includes(p.id)).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => start(p.id)}
          disabled={pending !== null}
          aria-busy={pending === p.id}
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface text-body font-medium text-ink transition-[background-color,border-color,transform] duration-150 ease-out hover:border-ink/40 hover:bg-parchment active:scale-[0.98] disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 18px mark, nothing to optimise */}
          <img src={p.mark} alt="" width={18} height={18} aria-hidden />
          {pending === p.id ? "Opening…" : p.label}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-small text-ink">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 pt-3 text-meta text-muted-fg" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or with your email
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
