"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Input,
    Textarea,
    Chip,
    Spinner,
    Divider,
    ScrollShadow,
    Progress,
} from "@heroui/react";
import {
    Database,
    Upload,
    FileText,
    Search,
    ArrowLeft,
    Trash2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Document {
    id: number;
    name: string;
    created_at: string;
}

interface QueryResult {
    content: string;
    score: number;
    doc_name: string | null;
    chunk_index: number;
    metadata: Record<string, any>;
}

interface KnowledgeBase {
    id: number;
    name: string;
    description: string | null;
    document_count: number;
    created_at: string;
}

export default function KnowledgeDetailPage() {
    const params = useParams();
    const kbId = params.id as string;

    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);

    // 上传
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // 检索
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<QueryResult[]>([]);
    const [rerank, setRerank] = useState(true);

    useEffect(() => {
        loadKnowledgeBase();
    }, [kbId]);

    async function loadKnowledgeBase() {
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}`);
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

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("chunk_size", "500");
        formData.append("chunk_overlap", "50");

        try {
            // 模拟进度
            const progressInterval = setInterval(() => {
                setUploadProgress(p => Math.min(p + 10, 90));
            }, 200);

            const resp = await fetch(`/api/knowledge/datasets/${kbId}/documents`, {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (resp.ok) {
                await loadKnowledgeBase();
            }
        } catch (e) {
            console.error("Upload failed:", e);
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    }

    async function handleSearch() {
        if (!query.trim()) return;

        setSearching(true);
        setResults([]);

        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: query,
                    top_k: 10,
                    rerank: rerank,
                    rerank_top_k: 5,
                }),
            });

            if (resp.ok) {
                const data = await resp.json();
                setResults(data.results);
            }
        } catch (e) {
            console.error("Search failed:", e);
        } finally {
            setSearching(false);
        }
    }

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
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
                                <p className="text-xs text-foreground-500">{kb.document_count} 文档</p>
                            </div>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleUpload}
                    />
                    <Button
                        color="primary"
                        startContent={<Upload size={16} />}
                        onPress={() => fileInputRef.current?.click()}
                        isLoading={uploading}
                    >
                        上传文档
                    </Button>
                </div>

                {uploading && (
                    <Progress
                        value={uploadProgress}
                        size="sm"
                        color="primary"
                        className="h-1"
                    />
                )}
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 检索面板 */}
                <Card className="h-fit">
                    <CardHeader className="flex items-center gap-2 pb-0">
                        <Search size={18} className="text-primary" />
                        <span className="font-bold">检索测试</span>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <Textarea
                            placeholder="输入检索问题..."
                            value={query}
                            onValueChange={setQuery}
                            variant="bordered"
                            minRows={3}
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Chip
                                    variant={rerank ? "solid" : "bordered"}
                                    color={rerank ? "primary" : "default"}
                                    className="cursor-pointer"
                                    onClick={() => setRerank(!rerank)}
                                >
                                    Rerank
                                </Chip>
                            </div>
                            <Button
                                color="primary"
                                onPress={handleSearch}
                                isLoading={searching}
                                startContent={!searching && <Search size={16} />}
                            >
                                检索
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* 结果面板 */}
                <Card className="h-fit min-h-[300px]">
                    <CardHeader className="flex items-center gap-2 pb-0">
                        <FileText size={18} className="text-success" />
                        <span className="font-bold">检索结果</span>
                        {results.length > 0 && (
                            <Chip size="sm" variant="flat">
                                {results.length} 条
                            </Chip>
                        )}
                    </CardHeader>
                    <CardBody>
                        {searching ? (
                            <div className="flex items-center justify-center py-10">
                                <Spinner />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-foreground-400">
                                <Search size={40} className="mb-4 opacity-30" />
                                <p className="text-sm">输入问题进行检索</p>
                            </div>
                        ) : (
                            <ScrollShadow className="max-h-[500px] space-y-3">
                                {results.map((result, i) => (
                                    <div
                                        key={i}
                                        className="p-4 rounded-lg border border-divider bg-content1 hover:border-primary/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Chip size="sm" color="success" variant="flat">
                                                    {(result.score * 100).toFixed(1)}%
                                                </Chip>
                                                {result.doc_name && (
                                                    <span className="text-xs text-foreground-500">
                                                        {result.doc_name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-foreground-400">
                                                #{result.chunk_index + 1}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed">
                                            {result.content}
                                        </p>
                                    </div>
                                ))}
                            </ScrollShadow>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
