"use client";

import { usePathname } from "next/navigation";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { PortalGate } from "@/components/shared/portal-gate";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";

const SECTIONS: ShellSection[] = [
  {
    label: "Work",
    links: [
      // No "New document" here: a document starts from the prompt on
      // Documents, which drafts it or opens intake for what is missing.
      { href: "/documents", label: "Documents", icon: "description" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/billing", label: "Billing", icon: "receipt_long" },
      { href: "/settings/privacy", label: "Privacy", icon: "lock" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

/** The document workspace manages its own three-pane scrolling. */
function isWorkspace(pathname: string): boolean {
  return /^\/documents\/[^/]+$/.test(pathname);
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <PortalGate portal="client">
      <AppShell
        sections={SECTIONS}
        homeHref="/documents"
        identity={{
          name: MOCK_CLIENT_ORG.name,
          standing: "Client",
          menuHref: "/settings",
        }}
        fullBleed={isWorkspace(pathname)}
      >
        {children}
      </AppShell>
    </PortalGate>
  );
}
