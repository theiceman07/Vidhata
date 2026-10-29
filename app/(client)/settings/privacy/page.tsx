import { redirect } from "next/navigation";

/** Privacy is a tab of Settings now; an old link or bookmark lands there. */
export default function PrivacyRedirect() {
  redirect("/settings?tab=privacy");
}
