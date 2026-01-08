"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardBody,
    Button,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Textarea,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Chip,
    Spinner,
} from "@heroui/react";
import {
    Database,
    Plus,
    FileText,
    Search,
    Trash2,
    Settings,
    Upload,
} from "lucide-react";
import Link from "next/link";

interface KnowledgeBase {
    id: number;
    name: string;
    description: string | null;
    document_count: number;
    created_at: string;
}

export default function KnowledgePage() {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // 创建表单
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newRetrievalMode, setNewRetrievalMode] = useState("hybrid");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadKnowledgeBases();
    }, []);

    async function loadKnowledgeBases() {
        try {
            const resp = await fetch("/api/knowledge/datasets");
            if (resp.ok) {
                const data = await resp.json();
                setKnowledgeBases(data);
            }
        } catch (e) {
            console.error("Failed to load knowledge bases:", e);
        } finally {
            setLoading(false);
        }
    }

    async function createKnowledgeBase() {
        if (!newName.trim()) return;

        setCreating(true);
        try {
            const resp = await fetch("/api/knowledge/datasets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    description: newDescription,
                    retrieval_mode: newRetrievalMode,
                }),
            });

            if (resp.ok) {
                await loadKnowledgeBases();
                onClose();
                setNewName("");
                setNewDescription("");
            }
        } catch (e) {
            console.error("Failed to create knowledge base:", e);
        } finally {
            setCreating(false);
        }
    }

    async function deleteKnowledgeBase(id: number) {
        if (!confirm("确定要删除这个知识库吗？")) return;

        try {
            await fetch(`/api/knowledge/datasets/${id}`, { method: "DELETE" });
            await loadKnowledgeBases();
        } catch (e) {
            console.error("Failed to delete:", e);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="border-b border-divider bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Database className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">知识库</h1>
                            <p className="text-xs text-foreground-500">管理您的文档和检索配置</p>
                        </div>
                    </div>

                    <Button
                        color="primary"
                        startContent={<Plus size={16} />}
                        onPress={onOpen}
                        className="font-semibold shadow-lg shadow-primary/20"
                    >
                        创建知识库
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner size="lg" />
                    </div>
                ) : knowledgeBases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6">
                            <Database className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">还没有知识库</h2>
                        <p className="text-foreground-500 mb-6 max-w-sm">
                            创建一个知识库，上传文档，让 AI 能够检索您的专属知识
                        </p>
                        <Button color="primary" onPress={onOpen} startContent={<Plus size={16} />}>
                            创建第一个知识库
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {knowledgeBases.map((kb) => (
                            <Link href={`/knowledge/${kb.id}`} key={kb.id}>
                                <Card
                                    isPressable
                                    className="group hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-transparent hover:border-emerald-500/30"
                                >
                                    <CardBody className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <Database className="w-6 h-6 text-white" />
                                            </div>
                                            <Button
                                                isIconOnly
                                                variant="light"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    deleteKnowledgeBase(kb.id);
                                                }}
                                            >
                                                <Trash2 size={14} className="text-danger" />
                                            </Button>
                                        </div>

                                        <h3 className="text-lg font-bold mb-1">{kb.name}</h3>
                                        <p className="text-sm text-foreground-500 mb-4 line-clamp-2">
                                            {kb.description || "暂无描述"}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Chip size="sm" variant="flat" color="success">
                                                <FileText size={12} className="mr-1" />
                                                {kb.document_count} 文档
                                            </Chip>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalContent>
                    <ModalHeader className="flex items-center gap-2">
                        <Database size={20} className="text-primary" />
                        创建知识库
                    </ModalHeader>
                    <ModalBody>
                        <Input
                            label="名称"
                            placeholder="输入知识库名称"
                            value={newName}
                            onValueChange={setNewName}
                            variant="bordered"
                        />
                        <Textarea
                            label="描述"
                            placeholder="输入知识库描述（可选）"
                            value={newDescription}
                            onValueChange={setNewDescription}
                            variant="bordered"
                        />
                        <Dropdown>
                            <DropdownTrigger>
                                <Button variant="bordered" className="justify-between">
                                    检索模式: {newRetrievalMode === "hybrid" ? "混合检索" : newRetrievalMode === "semantic" ? "语义检索" : "关键词检索"}
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                onAction={(key) => setNewRetrievalMode(key as string)}
                            >
                                <DropdownItem key="hybrid">混合检索（推荐）</DropdownItem>
                                <DropdownItem key="semantic">语义检索</DropdownItem>
                                <DropdownItem key="keyword">关键词检索</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onClose}>
                            取消
                        </Button>
                        <Button
                            color="primary"
                            onPress={createKnowledgeBase}
                            isLoading={creating}
                        >
                            创建
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
