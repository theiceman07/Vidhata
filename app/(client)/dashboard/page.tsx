import { redirect } from "next/navigation";

/**
 * The dashboard is now the work queue at /documents.
 *
 * Navigation speaks the work rather than the software, so there is no
 * "Dashboard" in this product. The route is kept as a redirect because
 * it was linked from elsewhere and may be bookmarked.
 */
export default function DashboardRedirect() {
  redirect("/documents");
}
