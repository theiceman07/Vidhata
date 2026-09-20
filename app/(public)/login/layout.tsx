import type { Metadata } from "next";

// QA 4.1: /login used to share the root layout's single <title>/description
// with every other route. The page itself is "use client" (interactive
// form), so route metadata has to live in this sibling layout — a Server
// Component — per Next.js App Router rules.
export const metadata: Metadata = {
  title: "Client sign in",
  description: "Sign in to track your documents, review findings and print your execution checklist.",
  robots: { index: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
