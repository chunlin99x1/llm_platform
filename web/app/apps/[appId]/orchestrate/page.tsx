import OrchestratePage from "@/components/apps/orchestrate-page";

export default async function Page({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  return <OrchestratePage appId={Number(appId)} />;
}

