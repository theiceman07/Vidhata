"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/shared/auth-screen";
import { BrandLoader } from "@/components/shared/brand-loader";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { finishProviderSignIn, PROVIDER_KEY } from "@/lib/api/auth";
import { keepProviderPrefill } from "@/lib/api/access-requests";

/**
 * Where Google and Microsoft send the browser back. A client account goes to its documents. An
 * address with no account goes to the request-access form, with the name and email from the
 * provider filled in (kept in sessionStorage, never the URL). Anything else is one plain failure.
 */
export default function ProviderCallbackPage() {
  const router = useRouter();
  const { setRole } = useSession();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let provider: "google" | "azure" = "google";
    try {
      if (window.sessionStorage.getItem(PROVIDER_KEY) === "azure") provider = "azure";
    } catch {
      // Storage unavailable: the label on the form says Google.
    }

    finishProviderSignIn()
      .then((result) => {
        if (result.kind === "client") {
          setRole("client");
          router.replace("/documents");
        } else if (result.kind === "no-account") {
          keepProviderPrefill({ provider, name: result.name, email: result.email });
          router.replace("/request-access?from=signin");
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }, [router, setRole]);

  if (!failed) {
    return (
      <>
        <BrandLoader />
        <span className="sr-only" role="status">
          Signing you in
        </span>
      </>
    );
  }

  return (
    <AuthScreen portal="client" title="That sign-in didn't finish." intro="Nothing was changed. Try again, or use your email and password.">
      <Button asChild className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </AuthScreen>
  );
}
