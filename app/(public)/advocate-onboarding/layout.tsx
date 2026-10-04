import type { Metadata } from "next";

// An invitation link is for one advocate. It is not a page to be found, so it
// is kept out of search and out of the sitemap.
export const metadata: Metadata = {
  title: "Join the panel",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
