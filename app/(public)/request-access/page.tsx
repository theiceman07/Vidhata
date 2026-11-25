import type { Metadata } from "next";
import { ClientAccessForm, RequestBand } from "@/components/marketing/access-forms";
import { PageOpening } from "@/components/marketing/page-opening";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Request access",
  description: "Vidhataa is in preview and accounts are opened by invitation. Tell us the contract you need.",
};

/**
 * Where every "Request access" leads: the hero prompt (with the brief carried in), the sign-in
 * page, and a Google or Microsoft sign-in that found no account (?from=signin, with the name and
 * email from the provider filled in).
 */
export default async function RequestAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <div>
      <SiteHeader />
      <main>
        <PageOpening
          title="Request access."
          lead="Vidhataa is in preview, and accounts are opened by invitation. Tell us who you are and the contract you need, and we'll be in touch."
        />
        <RequestBand
          title="What happens next"
          steps={[
            "You tell us who you are and the contract you need.",
            "We read it and write back to the email you give us.",
            "When your account is open, you sign in and start your first document.",
          ]}
        >
          <ClientAccessForm fromSignIn={from === "signin"} />
        </RequestBand>
      </main>
      <SiteFooter />
    </div>
  );
}
