"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { BrandLoader } from "@/components/shared/brand-loader";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";

const SECTIONS: ShellSection[] = [
  {
    label: "Review",
    links: [{ href: "/queue", label: "Queue", icon: "description" }],
  },
  {
    label: "Account",
    links: [{ href: "/profile", label: "Profile", icon: "person" }],
  },
];

/** The review workspace manages its own three-pane scrolling. */
function isWorkspace(pathname: string): boolean {
  return /^\/review\/[^/]+$/.test(pathname);
}

export default function LawyerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (role === "lawyer") return;
    // See app/(client)/layout.tsx — same fix, mirrored (QA 3.1 / 10.2).
    if (role === "client") router.replace("/documents");
    else router.replace("/advocate-login");
  }, [ready, role, router]);

  // The stored role is read after the first render. Until then who you
  // are is unknown, not absent, so this waits rather than redirecting,
  // and a wrong role waits here while it is sent to its own portal.
  if (!ready || role !== "lawyer") return <BrandLoader />;

  return (
    <AppShell
      sections={SECTIONS}
      homeHref="/queue"
      identity={{
        name: CURRENT_ADVOCATE.name,
        standing: "Advocate",
        menuHref: "/profile",
      }}
      fullBleed={isWorkspace(pathname)}
    >
      {children}
    </AppShell>
  );
}
