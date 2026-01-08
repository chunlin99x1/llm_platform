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
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Textarea,
    useDisclosure,
    Switch,
} from "@heroui/react";
import {
    ArrowLeft,
    FileText,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    Pencil,
    MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

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
    keywords?: string[];
    hit_count: number;
    enabled: boolean;
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

    // Edit Modal State
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editKeywords, setEditKeywords] = useState("");
    const [editEnabled, setEditEnabled] = useState(true);
    const [saving, setSaving] = useState(false);

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

    function openEditModal(seg: Segment) {
        setEditingSegment(seg);
        setEditContent(seg.content);
        setEditKeywords(seg.keywords?.join(" ") || "");
        setEditEnabled(seg.enabled);
        onOpen();
    }

    async function handleSaveSegment() {
        if (!editingSegment) return;
        setSaving(true);

        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/documents/${docId}/segments/${editingSegment.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: editContent,
                    keywords: editKeywords.split(" ").filter(k => k.trim()),
                    enabled: editEnabled
                })
            });

            if (resp.ok) {
                onClose();
                loadSegments();
                toast.success("分段更新成功");
            } else {
                toast.error("更新失败");
            }
        } catch (e) {
            console.error("Failed to save segment:", e);
            toast.error("更新失败");
        } finally {
            setSaving(false);
        }
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
                                        {!seg.enabled && (
                                            <Chip size="sm" variant="flat" color="default" className="text-xs h-5">
                                                已禁用
                                            </Chip>
                                        )}
                                        {seg.keywords && seg.keywords.length > 0 && (
                                            <div className="flex gap-1">
                                                {seg.keywords.map((k, i) => (
                                                    <span key={i} className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">{k}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Button isIconOnly size="sm" variant="light" className="text-gray-400" onPress={() => openEditModal(seg)}>
                                        <Pencil size={14} />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardBody className={`pt-0 ${!seg.enabled ? "opacity-50" : ""}`}>
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

            {/* Edit Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="2xl">
                <ModalContent>
                    <ModalHeader>编辑分段 #{editingSegment ? editingSegment.position + 1 : ""}</ModalHeader>
                    <ModalBody>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">分段内容</label>
                                <Textarea
                                    minRows={6}
                                    maxRows={15}
                                    value={editContent}
                                    onValueChange={setEditContent}
                                    classNames={{ input: "text-base leading-relaxed" }}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">关键词 (空格分隔)</label>
                                    <Input
                                        value={editKeywords}
                                        onValueChange={setEditKeywords}
                                        placeholder="keyword1 keyword2"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">状态</label>
                                    <div className="flex items-center gap-2 h-10">
                                        <Switch isSelected={editEnabled} onValueChange={setEditEnabled} size="sm" />
                                        <span className="text-sm">{editEnabled ? "启用" : "禁用"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onClose}>取消</Button>
                        <Button color="primary" onPress={handleSaveSegment} isLoading={saving}>保存</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
