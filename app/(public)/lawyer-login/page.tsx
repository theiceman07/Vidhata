import { redirect } from "next/navigation";

/**
 * Client-facing copy says advocate, so the route does too. Kept as a
 * redirect because the old path was linked and may be bookmarked.
 */
export default function LawyerLoginRedirect() {
  redirect("/advocate-login");
}
