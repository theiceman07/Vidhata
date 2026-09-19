import { PageHeader } from "@/components/shared/page-header";

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <PageHeader
      title={`Chat — document ${params.id}`}
      description="Placeholder"
    />
  );
}
