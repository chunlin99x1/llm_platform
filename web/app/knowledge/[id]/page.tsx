"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function KnowledgeDetailRedirect() {
    const router = useRouter();
    const params = useParams();
    const kbId = params.id as string;

    useEffect(() => {
        // 重定向到文档页面
        router.replace(`/knowledge/${kbId}/documents`);
    }, [kbId, router]);

    return null;
}
