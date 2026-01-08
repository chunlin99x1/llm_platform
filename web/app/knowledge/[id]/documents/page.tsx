"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Button,
    Input,
    Chip,
    Spinner,
    Progress,
    Pagination,
} from "@heroui/react";
import {
    Upload,
    Search,
    Trash2,
    FileText,
    RefreshCw,
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
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">文档</h2>
                    <p className="text-xs text-gray-500 mt-1">{total} 个文档</p>
                </div>
                <div className="flex items-center gap-3">
                    <Input
                        placeholder="搜索..."
                        value={keyword}
                        onValueChange={setKeyword}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        startContent={<Search size={14} className="text-gray-400" />}
                        size="sm"
                        className="w-56"
                        classNames={{
                            inputWrapper: "bg-white border text-sm"
                        }}
                    />
                    <Button
                        isIconOnly
                        variant="flat"
                        size="sm"
                        className="w-9 h-9 bg-white border border-gray-200"
                        onPress={() => loadDocuments()}
                    >
                        <RefreshCw size={14} className="text-gray-600" />
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleUpload}
                    />
                    <Button
                        size="sm"
                        className="bg-[#155EEF] text-white h-9 px-4 font-medium shadow-sm"
                        startContent={<Upload size={14} />}
                        onPress={() => fileInputRef.current?.click()}
                        isLoading={uploading}
                    >
                        上传文件
                    </Button>
                </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
                <div className="mb-4">
                    <Progress value={uploadProgress} size="sm" color="primary" className="h-1" />
                </div>
            )}

            {/* Documents Table Container */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shadow-sm">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/80 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">文档名称</th>
                                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider w-32">状态</th>
                                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider w-24">分段</th>
                                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider w-32">字符数</th>
                                <th className="text-left px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider w-40">创建时间</th>
                                <th className="text-right px-6 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider w-24">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex justify-center">
                                            <Spinner size="lg" />
                                        </div>
                                    </td>
                                </tr>
                            ) : documents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                                                <FileText className="text-gray-300" size={24} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-600">暂无文档</span>
                                            <span className="text-xs text-gray-400">点击右上角上传按钮添加文档</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => {
                                    const status = statusConfig[doc.status] || statusConfig.pending;
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={doc.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="truncate text-gray-900 dark:text-white font-medium max-w-[300px]">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
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
                                                    className="h-6 gap-1 px-2 border-0"
                                                >
                                                    {status.label}
                                                </Chip>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium">
                                                {doc.segment_count > 0 ? (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{doc.segment_count}</span>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                                {doc.word_count.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 text-xs">
                                                {new Date(doc.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/knowledge/${kbId}/documents/${doc.id}`}>
                                                        <Button isIconOnly variant="light" size="sm" className="w-8 h-8 text-gray-500 hover:text-[#155EEF] hover:bg-blue-50">
                                                            <Eye size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        isIconOnly
                                                        variant="light"
                                                        size="sm"
                                                        className="w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                        onPress={() => deleteDocument(doc.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-center bg-gray-50/50">
                        <Pagination
                            total={totalPages}
                            page={page}
                            onChange={setPage}
                            size="sm"
                            classNames={{
                                cursor: "bg-[#155EEF]"
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
