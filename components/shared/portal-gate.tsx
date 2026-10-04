"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { PORTAL_PATHS, type StoredRole } from "@/lib/session-expiry";
import { BrandLoader } from "@/components/shared/brand-loader";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";

/**
 * The door to a portal.
 *
 * Both portals wait on the session here and nowhere else. Who you are is
 * unknown until the stored session has been read, so it waits rather than
 * redirecting. Then one of four things is true:
 *
 * - you are signed in to this portal, and the page renders;
 * - you never signed in, and you are sent to this portal's sign-in page;
 * - your session ended, and a screen says so, with the sign-in page of the
 *   portal the session was in;
 * - you are signed in to the other portal, and a screen says this account
 *   cannot open this page.
 *
 * The last renders before the page does, whatever the address. The page is
 * never mounted, so nothing is fetched, and the screen is the same for an
 * address that exists and one that does not: it cannot be used to find out
 * whether a document is there.
 */
export function PortalGate({
  portal,
  children,
}: {
  portal: StoredRole;
  children: React.ReactNode;
}) {
  const { role, ready, expiredRole } = useSession();
  const router = useRouter();
  const neverSignedIn = ready && role === null && expiredRole === null;

  useEffect(() => {
    if (neverSignedIn) router.replace(PORTAL_PATHS[portal].signIn);
  }, [neverSignedIn, portal, router]);

  if (!ready || neverSignedIn) return <BrandLoader />;
  if (role === portal) return <>{children}</>;
  if (role === null && expiredRole) return <SessionEnded role={expiredRole} />;
  if (role) return <NotAuthorised role={role} />;
  return <BrandLoader />;
}

const standing = (role: StoredRole) => (role === "lawyer" ? "an advocate" : "a client");

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto w-full max-w-6xl px-6 pt-10">
        <Link href="/" aria-label="Vidhata home" className="inline-block text-ink">
          <BrandLogo size="xl" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-12">
        <div className="w-full max-w-[26rem]">
          <h1 className="font-display text-h1 text-ink">{title}</h1>
          <p className="mt-3 text-body text-muted-fg">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">{children}</div>
        </div>
      </main>
    </div>
  );
}

function SessionEnded({ role }: { role: StoredRole }) {
  return (
    <Notice
      title="Your session has ended"
      body={`You were signed out. Sign in again to carry on as ${standing(role)}.`}
    >
      <Button asChild size="lg">
        <Link href={PORTAL_PATHS[role].signIn}>Sign in</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/">Back to the site</Link>
      </Button>
    </Notice>
  );
}

function NotAuthorised({ role }: { role: StoredRole }) {
  const { signOut } = useSession();
  const router = useRouter();
  return (
    <Notice
      title="This page isn't available to your account"
      body={`You are signed in as ${standing(role)}, and this address is not one that account can open.`}
    >
      <Button asChild size="lg">
        <Link href={PORTAL_PATHS[role].home}>Go to your workspace</Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => {
          signOut();
          router.replace("/");
        }}
      >
        Sign out
      </Button>
    </Notice>
  );
}
