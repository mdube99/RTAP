import OperationDetailPage from "@features/operations/components/operation-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OperationDetail({ params }: Props) {
  const { id } = await params;
  const operationId = Number(id);

  // Pass operation ID to client component for real-time data fetching
  return <OperationDetailPage operationId={operationId} />;
}
