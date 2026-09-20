import type { Metadata } from "next";

// See app/(public)/login/layout.tsx for why this lives in a layout.
export const metadata: Metadata = {
  title: "Advocate sign in",
  description: "For empanelled advocates only. Review findings, adjudicate and sign off on client documents.",
  robots: { index: false },
};

export default function LawyerLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
