import type { Metadata } from "next";
import Link from "next/link";
import { AdvocateInviteForm } from "@/components/marketing/advocate-invite-form";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Request an invitation",
};

// A request for an invitation, not an application. The page says that
// empanelment is by invitation and that the product keeps no public
// directory, ratings or ranking of advocates. Nothing is sent in the preview.
export default function AdvocateInvitePage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 md:pt-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <div>
            <Link
              href="/advocate-login"
              className="inline-flex min-h-11 items-center text-meta text-muted-fg hover:text-ink"
            >
              Advocate sign-in
            </Link>
            <h1 className="mt-2 font-display text-display text-ink">Request an invitation</h1>
            <div className="mt-4 max-w-measure space-y-3 text-lead text-muted-fg">
              <p>
                Empanelment at Vidhata is by invitation. You cannot apply for a place on the panel,
                and this form does not apply for one: it tells us who you are, so that we can write
                to you if a place opens.
              </p>
              <p>
                Vidhata keeps no public directory of advocates, and shows no ratings or ranking of
                them, in keeping with the Bar Council of India&apos;s rules on advertising by
                advocates.
              </p>
            </div>
            <p className="mt-8 text-meta text-muted-fg">
              Already on the panel?{" "}
              <Link href="/advocate-login" className="link">
                Advocate sign-in
              </Link>
              .
            </p>
          </div>

          <AdvocateInviteForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
