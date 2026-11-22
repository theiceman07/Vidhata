"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { backendDataEnabled } from "@/lib/api/source";
import { authed, ownUserId } from "@/lib/api/backend";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";

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
  token: z.object({ id: z.string() }),
  profile: z.object({ full_name: z.string().nullable() }).nullable(),
});

export interface Me {
  id: string;
  name: string | null;
}

// One read of GET /me per signed-in account. The cache is keyed by the account's id, so a different
// account (sign out, then sign in as someone else in the same page load) is never served the
// previous account's name or id, and signing out empties it.
let cache: { uid: string; me: Promise<Me | null> } | null = null;

/** Forget the cached /me, for tests. */
export function resetMeCache(): void {
  cache = null;
}

export async function ownMe(): Promise<Me | null> {
  const uid = await ownUserId();
  if (!uid) {
    cache = null;
    return null;
  }
  if (!cache || cache.uid !== uid) {
    const mine = {
      uid,
      me: authed("/me", { method: "GET" }, MeReply)
        .then((r): Me => ({ id: r.token.id, name: r.profile?.full_name ?? null }))
        .catch((): Me | null => {
          if (cache === mine) cache = null; // try again on the next mount; the label shows meanwhile
          return null;
        }),
    };
    cache = mine;
  }
  return cache.me;
}

function useOwnMe(): Me | null {
  const backend = backendDataEnabled();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!backend) return;
    let live = true;
    ownMe().then((m) => {
      if (live) setMe(m);
    });
    return () => {
      live = false;
    };
  }, [backend]);

  return me;
}

export function useIdentityName(sampleName: string, label: string): string {
  const me = useOwnMe();
  return identityName(backendDataEnabled(), sampleName, me?.name ?? null, label);
}

/**
 * The signed-in advocate, for every call that names one. The preview uses the sample advocate. With
 * the real backend on, the id is the account's own id from GET /me, and it is "" until that is read,
 * so nothing is ever attributed to the sample advocate for a real account.
 */
export function useAdvocate(): { id: string; name: string; bar: string } {
  const backend = backendDataEnabled();
  const me = useOwnMe();
  return useMemo(
    () =>
      backend
        ? { id: me?.id ?? "", name: identityName(true, CURRENT_ADVOCATE.name, me?.name ?? null, "Lawyer"), bar: "" }
        : CURRENT_ADVOCATE,
    [backend, me],
  );
}
