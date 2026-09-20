import type { MetadataRoute } from "next";

// QA 4.1: /robots.txt used to 404. Portal routes carry client/advocate
// data behind a (non-existent) auth layer — Disallow them regardless, so
// nothing there is indexable even while auth doesn't exist yet.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/login", "/lawyer-login", "/terms", "/privacy", "/contact"],
      disallow: [
        "/dashboard",
        "/new",
        "/documents",
        "/queue",
        "/profile",
        "/review",
        "/dev",
      ],
    },
    sitemap: "https://vidhata-pi.vercel.app/sitemap.xml",
  };
}
