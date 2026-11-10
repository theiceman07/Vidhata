import type { Metadata } from "next";
import { DraftPaths } from "@/components/domain/draft-paths";
import { IntakeWizard } from "@/components/domain/intake-wizard";
import { PageHeader } from "@/components/shared/page-header";

// A server page: the tab title is set here, not by PageHeader's effect.
export const metadata: Metadata = { title: "Draft a document" };

export default function NewDealPage() {
  return (
    <div className="flex min-h-full w-full flex-col">
      <PageHeader
        back={{ fallbackHref: "/documents", label: "Documents" }}
        title="Draft a document"
        description="Describe the deal. Vidhataa drafts and screens it, then routes it to an advocate."
      />

      <div className="flex flex-1 flex-col">
        <DraftPaths>
          <IntakeWizard />
        </DraftPaths>
      </div>
    </div>
  );
}
