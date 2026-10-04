"use client";

import { usePathname } from "next/navigation";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { PortalGate } from "@/components/shared/portal-gate";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";

const SECTIONS: ShellSection[] = [
  {
    label: "Review",
    links: [
      { href: "/queue", label: "Queue", icon: "description" },
      { href: "/consultations", label: "Consultations", icon: "mail" },
    ],
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
  const pathname = usePathname();

  return (
    <PortalGate portal="lawyer">
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
    </PortalGate>
  );
}
