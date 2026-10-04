import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { AdvocateInviteForm } from "@/components/marketing/advocate-invite-form";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Request an invitation",
};

// A request for an invitation, not an application. The page says that
// empanelment is by invitation and that the product keeps no public
// directory, ratings or ranking of advocates. Nothing is sent in the preview.
export default function AdvocateInvitePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageHeader title="Request an invitation" backHref="/advocate-login" backLabel="Advocate sign-in" />

      <div className="mb-8 max-w-measure space-y-3 text-body text-ink">
        <p>
          Empanelment at Vidhata is by invitation. You cannot apply for a place on the panel, and
          this form does not apply for one: it tells us who you are, so that we can write to you if
          a place opens.
        </p>
        <p className="text-muted-fg">
          Vidhata keeps no public directory of advocates, and shows no ratings or ranking of them,
          in keeping with the Bar Council of India&apos;s rules on advertising by advocates.
        </p>
      </div>

      <AdvocateInviteForm />

      <p className="mt-4 text-small text-muted-fg">
        Already on the panel?{" "}
        <Link href="/advocate-login" className="text-accent underline underline-offset-2 hover:no-underline">
          Advocate sign-in
        </Link>
        .
      </p>
      <SiteFooter />
    </div>
  );
}
