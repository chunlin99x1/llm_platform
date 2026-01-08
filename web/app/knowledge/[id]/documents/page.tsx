"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Input,
    Chip,
    Spinner,
    Progress,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Pagination,
} from "@heroui/react";
import {
    Upload,
    Search,
    Trash2,
    FileText,
    RefreshCw,
    MoreVertical,
    Eye,
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
    indexing_task_id: string | null;
    created_at: string;
    updated_at: string;
}

interface DocumentListResponse {
    documents: Document[];
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

export default function DocumentsPage() {
    const params = useParams();
    const kbId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        loadDocuments();
    }, [kbId, page]);

    // 轮询更新正在索引的文档状态
    useEffect(() => {
        const indexingDocs = documents.filter(d => d.status === "indexing" || d.status === "pending");
        if (indexingDocs.length === 0) return;

        const interval = setInterval(() => {
            loadDocuments();
        }, 3000);

        return () => clearInterval(interval);
    }, [documents]);

    async function loadDocuments() {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });
            if (keyword) params.append("keyword", keyword);

            const resp = await fetch(`/api/knowledge/datasets/${kbId}/documents?${params}`);
            if (resp.ok) {
                const data: DocumentListResponse = await resp.json();
                setDocuments(data.documents);
                setTotal(data.total);
            }
        } catch (e) {
            console.error("Failed to load documents:", e);
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
                await loadDocuments();
            }
        } catch (e) {
            console.error("Upload failed:", e);
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    async function deleteDocument(docId: number) {
        if (!confirm("确定要删除这个文档吗？")) return;

        try {
            await fetch(`/api/knowledge/datasets/${kbId}/documents/${docId}`, {
                method: "DELETE",
            });
            await loadDocuments();
        } catch (e) {
            console.error("Delete failed:", e);
        }
    }

    function handleSearch() {
        setPage(1);
        loadDocuments();
    }

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">文档管理</h2>
                    <p className="text-sm text-foreground-500">
                        共 {total} 个文档
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="搜索文档..."
                            value={keyword}
                            onValueChange={setKeyword}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            startContent={<Search size={16} className="text-foreground-400" />}
                            size="sm"
                            className="w-64"
                        />
                        <Button
                            isIconOnly
                            variant="flat"
                            size="sm"
                            onPress={() => loadDocuments()}
                        >
                            <RefreshCw size={16} />
                        </Button>
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
            </div>

            {/* Upload Progress */}
            {uploading && (
                <Progress
                    value={uploadProgress}
                    size="sm"
                    color="primary"
                    className="h-1"
                />
            )}

            {/* Documents Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">还没有文档</h3>
                    <p className="text-foreground-500 mb-4">
                        上传文档开始构建知识库
                    </p>
                    <Button
                        color="primary"
                        startContent={<Upload size={16} />}
                        onPress={() => fileInputRef.current?.click()}
                    >
                        上传第一个文档
                    </Button>
                </div>
            ) : (
                <>
                    <Table aria-label="Documents table">
                        <TableHeader>
                            <TableColumn>文档名称</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>分段数</TableColumn>
                            <TableColumn>字符数</TableColumn>
                            <TableColumn>创建时间</TableColumn>
                            <TableColumn>操作</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => {
                                const status = statusConfig[doc.status] || statusConfig.pending;
                                const StatusIcon = status.icon;
                                return (
                                    <TableRow key={doc.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-foreground-400" />
                                                <span className="font-medium">{doc.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell>{doc.segment_count}</TableCell>
                                        <TableCell>{doc.word_count.toLocaleString()}</TableCell>
                                        <TableCell>
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/knowledge/${kbId}/documents/${doc.id}`}>
                                                    <Button isIconOnly variant="light" size="sm">
                                                        <Eye size={16} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    size="sm"
                                                    onPress={() => deleteDocument(doc.id)}
                                                >
                                                    <Trash2 size={16} className="text-danger" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center">
                            <Pagination
                                total={totalPages}
                                page={page}
                                onChange={setPage}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
