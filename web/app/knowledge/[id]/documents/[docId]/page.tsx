"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Chip,
    Spinner,
    Pagination,
    ScrollShadow,
    Input,
} from "@heroui/react";
import {
    ArrowLeft,
    FileText,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
} from "lucide-react";

interface Document {
    id: number;
    name: string;
    status: string;
    word_count: number;
    segment_count: number;
    error_message: string | null;
    created_at: string;
}

interface Segment {
    id: number;
    content: string;
    position: number;
    tokens: number;
    created_at: string;
}

interface SegmentListResponse {
    segments: Segment[];
    total: number;
    page: number;
    page_size: number;
}

const statusConfig: Record<string, { color: "success" | "warning" | "danger" | "default"; icon: any; label: string }> = {
    completed: { color: "success", icon: CheckCircle2, label: "已完成" },
    indexing: { color: "warning", icon: Loader2, label: "索引中" },
    pending: { color: "default", icon: Clock, label: "等待中" },
    error: { color: "danger", icon: AlertCircle, label: "失败" },
};

export default function DocumentDetailPage() {
    const params = useParams();
    const kbId = params.id as string;
    const docId = params.docId as string;

    const [doc, setDoc] = useState<Document | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        loadDocument();
    }, [docId]);

    useEffect(() => {
        loadSegments();
    }, [docId, page]);

    async function loadDocument() {
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/documents/${docId}`);
            if (resp.ok) {
                const data = await resp.json();
                setDoc(data);
            }
        } catch (e) {
            console.error("Failed to load document:", e);
        }
    }

    async function loadSegments() {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });
            if (keyword) params.append("keyword", keyword);

            const resp = await fetch(
                `/api/knowledge/datasets/${kbId}/documents/${docId}/segments?${params}`
            );
            if (resp.ok) {
                const data: SegmentListResponse = await resp.json();
                setSegments(data.segments);
                setTotal(data.total);
            }
        } catch (e) {
            console.error("Failed to load segments:", e);
        } finally {
            setLoading(false);
        }
    }

    function handleSearch() {
        setPage(1);
        loadSegments();
    }

    const totalPages = Math.ceil(total / pageSize);

    if (!doc && loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex items-center justify-center py-20">
                <p>文档不存在</p>
            </div>
        );
    }

    const status = statusConfig[doc.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/knowledge/${kbId}/documents`}>
                    <Button isIconOnly variant="light" size="sm">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <FileText size={24} className="text-foreground-400" />
                        <h2 className="text-xl font-bold">{doc.name}</h2>
                        <Chip
                            size="sm"
                            color={status.color}
                            variant="flat"
                            startContent={
                                <StatusIcon
                                    size={12}
                                    className={doc.status === "indexing" ? "animate-spin" : ""}
                                />
                            }
                        >
                            {status.label}
                        </Chip>
                    </div>
                    <p className="text-sm text-foreground-500 mt-1">
                        {doc.segment_count} 分段 · {doc.word_count.toLocaleString()} 字符
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="搜索分段内容..."
                    value={keyword}
                    onValueChange={setKeyword}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    startContent={<Search size={16} className="text-foreground-400" />}
                    className="max-w-md"
                />
                <Button variant="flat" onPress={handleSearch}>
                    搜索
                </Button>
            </div>

            {/* Segments */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Spinner />
                </div>
            ) : segments.length === 0 ? (
                <div className="text-center py-10 text-foreground-500">
                    暂无分段数据
                </div>
            ) : (
                <div className="space-y-4">
                    {segments.map((seg) => (
                        <Card key={seg.id} className="border border-divider">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <Chip size="sm" variant="flat" color="primary">
                                            #{seg.position + 1}
                                        </Chip>
                                        <span className="text-xs text-foreground-500">
                                            {seg.tokens} tokens
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardBody className="pt-0">
                                <ScrollShadow className="max-h-40">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {seg.content}
                                    </p>
                                </ScrollShadow>
                            </CardBody>
                        </Card>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center pt-4">
                            <Pagination
                                total={totalPages}
                                page={page}
                                onChange={setPage}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
