/** @type {import('next').NextConfig} */

// Preview builds only: send API calls through the preview's own domain so the browser makes
// same-origin requests and the API's CORS list is not involved. Set the API base URL setting to
// "/api-proxy" for the Preview environment and VIDHATA_API_PROXY_TARGET to the API origin
// (see .env.example).
// Never active in production or local dev (VERCEL_ENV is "preview" only on a Vercel preview build).
const proxyTarget = (process.env.VIDHATA_API_PROXY_TARGET || "").trim().replace(/\/+$/, "");
const previewProxy = process.env.VERCEL_ENV === "preview" && /^https:\/\/[^/]+$/.test(proxyTarget);

const nextConfig = {
  async rewrites() {
    return previewProxy ? [{ source: "/api-proxy/:path*", destination: `${proxyTarget}/:path*` }] : [];
  },
};

export default nextConfig;
