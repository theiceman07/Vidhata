import { PageHeader } from "@/components/shared/page-header";

export default function ChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PageHeader
      title={`Execution checklist — ${params.id}`}
      description="Placeholder"
    />
  );
}
