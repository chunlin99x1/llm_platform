"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeleton";

const KnowledgeList = dynamic(() => import("@/components/knowledge/knowledge-list").then(mod => mod.KnowledgeList), {
    loading: () => <PageSkeleton />,
    ssr: false
});

export default function KnowledgePage() {
    return <KnowledgeList />;
}
