"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Button,
    Spinner,
} from "@heroui/react";
import {
    Database,
    FileText,
    Search,
    Settings,
    ArrowLeft,
} from "lucide-react";

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

    // 确定当前激活的 tab
    const activeKey = navItems.find((item) => pathname.includes(item.href))?.key || "documents";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!kb) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>知识库不存在</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="border-b border-divider bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/knowledge">
                            <Button isIconOnly variant="light" size="sm">
                                <ArrowLeft size={18} />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Database className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">{kb.name}</h1>
                                <p className="text-xs text-foreground-500">
                                    {kb.document_count} 文档 · {kb.word_count.toLocaleString()} 字符
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto flex">
                {/* Sidebar */}
                <div className="w-48 border-r border-divider min-h-[calc(100vh-73px)] p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeKey === item.key;
                        return (
                            <Link
                                key={item.key}
                                href={`/knowledge/${kbId}/${item.href}`}
                            >
                                <div
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isActive
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "hover:bg-content2 text-foreground-600"
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="text-sm">{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 p-6">{children}</div>
            </div>
        </div>
    );
}
