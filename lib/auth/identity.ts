"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { backendDataEnabled } from "@/lib/api/source";
import { authed } from "@/lib/api/backend";

/**
 * The name the portal shows for the person signed in. The preview shows its sample name. With the
 * real backend on it shows the account's stored display name (GET /me, profile.full_name), and the
 * neutral label ("Lawyer" or "Client") when there is none or it has not loaded. A sample name is
 * never shown for a real account, and neither is the email.
 */
export function identityName(
  backend: boolean,
  sampleName: string,
  storedName: string | null,
  label: string,
): string {
  if (!backend) return sampleName;
  const name = storedName?.trim();
  return name ? name : label;
}

/** The first word of a name for a greeting, or the label when the name is the label. */
export function greetingName(name: string): string {
  return name.split(" ")[0];
}

const MeReply = z.object({
  profile: z.object({ full_name: z.string().nullable() }).nullable(),
});

let stored: Promise<string | null> | null = null;

function storedDisplayName(): Promise<string | null> {
  stored ??= authed("/me", { method: "GET" }, MeReply)
    .then((me) => me.profile?.full_name ?? null)
    .catch(() => {
      stored = null; // try again on the next mount; the label shows meanwhile
      return null;
    });
  return stored;
}

export function useIdentityName(sampleName: string, label: string): string {
  const backend = backendDataEnabled();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!backend) return;
    let live = true;
    storedDisplayName().then((n) => {
      if (live) setName(n);
    });
    return () => {
      live = false;
    };
  }, [backend]);

  return identityName(backend, sampleName, name, label);
}
