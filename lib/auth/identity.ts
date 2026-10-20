"use client";

import { useEffect, useState } from "react";
import { backendDataEnabled } from "@/lib/api/source";
import { getSupabaseClient } from "./supabaseClient";

/**
 * The name the portal shows for the person signed in. The preview shows its sample name. With the
 * real backend on it shows the account's own email, and a neutral label until that is read, so a
 * real account is never shown under a sample organisation's name.
 */
export function identityName(backend: boolean, sampleName: string, email: string | null): string {
  if (!backend) return sampleName;
  return email ?? "Signed in";
}

export function useIdentityName(sampleName: string): string {
  const backend = backendDataEnabled();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!backend) return;
    let live = true;
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (live) setEmail(data.session?.user.email ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [backend]);

  return identityName(backend, sampleName, email);
}
