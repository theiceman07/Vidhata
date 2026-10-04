import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Security and data",
  description: "Where Vidhata keeps client data, how it is protected, and when it is used.",
};

// The four commitments are the product's own, from the fixes list. They are
// stated without detail the source does not give: no algorithm, region or
// retention period is named here, because none has been supplied. Counsel
// and the security owner should sign the wording off before launch.
const COMMITMENTS = [
  {
    title: "India data residency",
    body: "Client data is stored in India.",
  },
  {
    title: "Encryption",
    body: "Client documents are encrypted.",
  },
  {
    title: "No training without opt-in",
    body: "Your documents are not used to train models unless you opt in. The opt-in is off by default and can be withdrawn. This is how Vidhata handles consent under the Digital Personal Data Protection Act, 2023.",
  },
  {
    title: "Audit trail",
    body: "Every flag, disposition and sign-off on a document is recorded with who made it and when.",
  },
];

export default function SecurityPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-24 text-center md:pt-32">
          <h1 className="mx-auto max-w-3xl font-display text-display text-ink">
            How Vidhata handles your data.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead text-muted-fg">
            Four commitments, stated plainly.
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div
            role="note"
            className="mx-auto max-w-measure rounded-card border border-caution/30 bg-caution/10 p-5 text-body text-ink"
          >
            <p className="font-medium">This is a preview.</p>
            <p className="mt-1 text-muted-fg">
              These are the commitments Vidhata is built to. The preview does not yet keep them: it
              stores nothing, and its sign-in is not real security. Do not put real contract or
              personal data into it.
            </p>
          </div>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-28">
            <ul className="grid gap-4 md:grid-cols-2">
              {COMMITMENTS.map((c) => (
                <li key={c.title} className="rounded-card bg-paper p-6">
                  <h2 className="font-display text-h3 text-ink">{c.title}</h2>
                  <p className="mt-2 max-w-measure text-body text-muted-fg">{c.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
