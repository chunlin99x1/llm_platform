"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeleton";

// Dynamically import the actual page component with SSR disabled
const OrchestratePage = dynamic(() => import("./orchestrate-page"), {
    loading: () => <PageSkeleton />,
    ssr: false
});

export function OrchestratePageWrapper({ appId }: { appId: number }) {
    return <OrchestratePage appId={appId} />;
}
