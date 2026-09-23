import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { IntakeWizard } from "@/components/domain/intake-wizard";

export default function NewDealPage() {
  return (
    <div className="mx-auto max-w-[90rem]">
      <Link
        href="/documents"
        className="inline-flex items-center gap-1 text-meta font-medium text-muted-fg transition-colors hover:text-ink"
      >
        <Icon name="chevron_left" size={16} />
        Documents
      </Link>

      <h1 className="mt-3 font-display text-h1 text-ink">Draft a document</h1>
      <p className="mt-2 max-w-xl text-body text-muted-fg">
        Describe the deal. Vidhata drafts and screens it, then routes it to an
        advocate.
      </p>

      <div className="mt-decision">
        <IntakeWizard />
      </div>
    </div>
  );
}
