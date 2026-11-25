import type { Metadata } from "next";
import { AdvocateApplicationForm, RequestBand } from "@/components/marketing/access-forms";
import { PageOpening } from "@/components/marketing/page-opening";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Join the advocate panel",
  description: "Apply to join the panel of advocates who settle and sign off Vidhataa documents.",
};

/**
 * "Join the panel", from the advocate sign-in page. Empanelment stays by invitation: this records
 * an application and says nothing about the terms of empanelment, which are for counsel.
 */
export default function AdvocateApplyPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <PageOpening
          title="Join the advocate panel."
          lead="Empanelled advocates settle every finding on a Vidhataa document and sign it off under their enrolment. Empanelment is by invitation. Tell us about your practice and we'll be in touch."
        />
        <RequestBand
          title="What happens next"
          steps={[
            "You tell us about your enrolment and your practice.",
            "We read your application and write back to the email you give us.",
            "Empanelment is by invitation, so an invitation link is how you join.",
          ]}
        >
          <AdvocateApplicationForm />
        </RequestBand>
      </main>
      <SiteFooter />
    </div>
  );
}
