import { PageHeader } from "@/components/shared/page-header";
import { IntakeWizard } from "@/components/domain/intake-wizard";

export default function NewDealPage() {
  return (
    <div>
      <PageHeader
        title="New deal"
        description="Describe the deal. We'll draft, screen and route it to an advocate."
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      <IntakeWizard />
    </div>
  );
}
