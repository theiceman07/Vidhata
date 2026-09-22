"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
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
  const { role } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (role === "lawyer") return;
    // See app/(client)/layout.tsx — same fix, mirrored (QA 3.1 / 10.2).
    if (role === "client") router.replace("/documents");
    else router.replace("/advocate-login");
  }, [role, router]);

  if (role !== "lawyer") return null;

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
