import { OrchestratePageWrapper } from "@/components/apps/orchestrate-page-wrapper";

export default async function Page({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  return <OrchestratePageWrapper appId={Number(appId)} />;
}

