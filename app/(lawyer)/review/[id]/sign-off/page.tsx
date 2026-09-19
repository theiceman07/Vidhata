import { PageHeader } from "@/components/shared/page-header";

export default function SignOffPage({ params }: { params: { id: string } }) {
  return (
    <PageHeader
      title={`Sign off — ${params.id}`}
      description="Placeholder"
    />
  );
}
