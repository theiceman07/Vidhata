"use client";

import { usePathname } from "next/navigation";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { PortalGate } from "@/components/shared/portal-gate";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import { useIdentityName } from "@/lib/auth/identity";

const SECTIONS: ShellSection[] = [
  {
    label: "Review",
    links: [
      { href: "/queue", label: "Queue", icon: "description" },
      { href: "/consultations", label: "Consultations", icon: "mail" },
      { href: "/payouts", label: "Payouts", icon: "receipt_long" },
      { href: "/metrics", label: "Metrics", icon: "monitoring" },
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
  const name = useIdentityName(CURRENT_ADVOCATE.name);

  return (
    <PortalGate portal="lawyer">
      <AppShell
        sections={SECTIONS}
        homeHref="/queue"
        identity={{
          name,
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
