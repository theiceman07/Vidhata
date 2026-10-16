import { notFound } from "next/navigation";

/**
 * The /dev pages are galleries and fixtures for building the product, not part of it. A
 * production build answers them with a 404, whatever the preview flag says; they exist only
 * under `next dev`. (robots.txt also asks crawlers to skip /dev, which keeps nobody out.)
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
