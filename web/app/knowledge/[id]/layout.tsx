"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button, Spinner } from "@heroui/react";
import { Database, FileText, Search, Settings, ChevronLeft } from "lucide-react";

interface KnowledgeBase {
    id: number;
    name: string;
    description: string | null;
    embedding_provider: string;
    embedding_model: string | null;
    retrieval_mode: string;
    document_count: number;
    word_count: number;
    created_at: string;
    updated_at: string;
}

const navItems = [
    { key: "documents", label: "文档", icon: FileText, href: "documents" },
    { key: "hit-testing", label: "召回测试", icon: Search, href: "hit-testing" },
    { key: "settings", label: "设置", icon: Settings, href: "settings" },
];

export default function KnowledgeDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const pathname = usePathname();
    const kbId = params.id as string;

    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadKnowledgeBase();
    }, [kbId]);

    async function loadKnowledgeBase() {
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/detail`);
            if (resp.ok) {
                const data = await resp.json();
                setKb(data);
            }
        } catch (e) {
            console.error("Failed to load:", e);
        } finally {
            setLoading(false);
        }
    }

    const activeKey = navItems.find((item) => pathname.includes(item.href))?.key || "documents";

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!kb) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500">知识库不存在</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                <div className="px-5 h-14 flex items-center gap-3 w-full">
                    <Button as={Link} href="/knowledge" isIconOnly variant="light" size="sm" className="text-foreground h-8 w-8 -ml-2">
                        <ChevronLeft size={16} />
                    </Button>
                    <div className="w-8 h-8 rounded-lg bg-[#FFF2F2] border border-[#FFE4E4] flex items-center justify-center flex-shrink-0">
                        <span className="text-base">📙</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{kb.name}</h1>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">文本数据</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Full Width & Height */}
            <div className="flex flex-1 min-h-0 w-full">
                {/* Sidebar */}
                <div className="w-[200px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 overflow-y-auto py-4 px-3 space-y-1">
                    <div className="mb-2 px-3 text-xs font-medium text-gray-500">配置</div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeKey === item.key;
                        return (
                            <Link key={item.key} href={`/knowledge/${kbId}/${item.href}`} className="block">
                                <div
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all ${isActive
                                        ? "bg-white shadow-sm border border-gray-200/60 text-[#155EEF] font-medium"
                                        : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? "text-[#155EEF]" : "text-gray-500"} />
                                    <span>{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
                    {/* Inner content scroll area */}
                    <div className="flex-1 h-full overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
