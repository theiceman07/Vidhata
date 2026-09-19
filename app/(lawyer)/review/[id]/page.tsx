import { PageHeader } from "@/components/shared/page-header";

export default function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <PageHeader title={`Review — ${params.id}`} description="Placeholder" />
  );
}
