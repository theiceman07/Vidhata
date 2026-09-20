import type { MetadataRoute } from "next";

// QA 4.1: /sitemap.xml used to 404. Only marketing pages — the portal
// carries client/advocate data and is Disallow'd in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vidhata-pi.vercel.app";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/pricing`, lastModified: now, priority: 0.8 },
    { url: `${base}/login`, lastModified: now, priority: 0.5 },
    { url: `${base}/lawyer-login`, lastModified: now, priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${base}/contact`, lastModified: now, priority: 0.3 },
  ];
}
