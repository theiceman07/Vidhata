import type { Metadata } from "next";
import { AdvocateApplicationForm } from "@/components/marketing/access-forms";
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
        <section className="tile-grain w-full bg-parchment">
          <div className="site-wrap py-16 md:py-24">
            <div className="mx-auto w-full max-w-2xl">
              <AdvocateApplicationForm />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
