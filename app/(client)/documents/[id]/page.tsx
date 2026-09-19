import { PageHeader } from "@/components/shared/page-header";

export default function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PageHeader title={`Document ${params.id}`} description="Placeholder" />
  );
}
