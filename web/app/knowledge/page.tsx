"use client";

import { useState, useEffect } from "react";
import {
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
    Spinner,
    Select,
    SelectItem,
    Selection,
} from "@heroui/react";
import {
    Plus,
    FileText,
    Search,
    Trash2,
    MoreHorizontal,
    ChevronDown,
    LayoutGrid,
    Cpu,
} from "lucide-react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-provider";
import { toast } from "sonner";

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

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    // Create Form State
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newRetrievalMode, setNewRetrievalMode] = useState("hybrid");
    const [creating, setCreating] = useState(false);

    // Model State
    interface ModelOption {
        provider: string;
        model: string;
        name: string; // Display name
    }
    const [embeddingModels, setEmbeddingModels] = useState<ModelOption[]>([]);
    const [rerankModels, setRerankModels] = useState<ModelOption[]>([]);
    const [selectedModel, setSelectedModel] = useState<Selection>(new Set([]));
    const [selectedRerankModel, setSelectedRerankModel] = useState<Selection>(new Set([]));

    const { confirm } = useConfirm();

    useEffect(() => {
        loadKnowledgeBases();
        loadModels();
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
            toast.error("加载知识库失败");
        } finally {
            setLoading(false);
        }
    }

    async function loadModels() {
        try {
            const resp = await fetch("/api/settings/model-providers");
            if (resp.ok) {
                const providers = await resp.json();
                const embedOptions: ModelOption[] = [];
                const rerankOptions: ModelOption[] = [];

                providers.forEach((p: any) => {
                    if (p.models) {
                        p.models.forEach((m: any) => {
                            if (m.model_type === "embedding") {
                                embedOptions.push({
                                    provider: p.name,
                                    model: m.name,
                                    name: `${p.name} - ${m.name}`
                                });
                            } else if (m.model_type === "rerank") {
                                rerankOptions.push({
                                    provider: p.name,
                                    model: m.name,
                                    name: `${p.name} - ${m.name}`
                                });
                            }
                        });
                    }
                });

                setEmbeddingModels(embedOptions);
                setRerankModels(rerankOptions);

                if (embedOptions.length > 0) {
                    // Default select the first one if not set
                    setSelectedModel(new Set([`${embedOptions[0].provider}:${embedOptions[0].model}`]));
                }

                if (rerankOptions.length > 0) {
                    setSelectedRerankModel(new Set([`${rerankOptions[0].provider}:${rerankOptions[0].model}`]));
                }
            }
        } catch (e) {
            console.error("Failed to load models:", e);
        }
    }

    async function createKnowledgeBase() {
        if (!newName.trim()) return;

        // Parse selected model
        const modelKey = Array.from(selectedModel)[0] as string;
        if (!modelKey) {
            toast.error("请选择 Embedding 模型");
            return;
        }
        const [provider, model] = modelKey.split(":");

        // Parse rerank model
        let rerankProvider = null;
        let rerankModelName = null;
        const rerankKey = Array.from(selectedRerankModel)[0] as string;
        if (rerankKey) {
            const [rProvider, rModel] = rerankKey.split(":");
            rerankProvider = rProvider;
            rerankModelName = rModel;
        }

        setCreating(true);
        try {
            const resp = await fetch("/api/knowledge/datasets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    description: newDescription,
                    retrieval_mode: newRetrievalMode,
                    embedding_provider: provider,
                    embedding_model: model,
                    rerank_provider: rerankProvider,
                    rerank_model: rerankModelName
                }),
            });

            if (resp.ok) {
                await loadKnowledgeBases();
                onClose();
                setNewName("");
                setNewDescription("");
                toast.success("知识库创建成功");
            } else {
                toast.error("创建失败");
            }
        } catch (e) {
            console.error("Failed to create knowledge base:", e);
            toast.error("创建失败");
        } finally {
            setCreating(false);
        }
    }

    async function deleteKnowledgeBase(id: number) {
        const confirmed = await confirm({
            title: "删除知识库",
            message: "确定要删除这个知识库吗？此操作不可恢复，所有文档和索引将被永久删除。",
            type: "danger",
            confirmText: "删除"
        });
        if (!confirmed) return;

        try {
            await fetch(`/api/knowledge/datasets/${id}`, { method: "DELETE" });
            toast.success("知识库已删除");
            await loadKnowledgeBases();
        } catch (e) {
            console.error("Failed to delete:", e);
            toast.error("删除失败");
        }
    }

    const filteredKbs = knowledgeBases.filter(kb =>
        kb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="flex flex-col gap-4 px-12 py-6 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">知识库</h1>
                    <Button
                        color="primary"
                        className="px-4 font-medium rounded-lg text-sm bg-[#155EEF] hover:bg-[#155EEF]/90 text-white"
                        startContent={<Plus size={16} />}
                        onPress={onOpen}
                    >
                        创建知识库
                    </Button>
                </div>
                <div className="text-sm text-gray-500 max-w-4xl">
                    导入您的文本数据，Dify 将会自动进行分段、清洗和索引，以便构建您的 AI 知识库。
                </div>

                <div className="flex items-center justify-end mt-2">
                    <div className="flex items-center gap-3 w-full md:w-[240px]">
                        <Input
                            placeholder="搜索知识库"
                            variant="bordered"
                            radius="lg"
                            size="md"
                            startContent={<Search size={16} className="text-gray-400" />}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            classNames={{
                                inputWrapper: "h-9 bg-white border-gray-200 hover:border-gray-300 transition-all shadow-sm",
                                input: "text-sm placeholder:text-gray-400"
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto px-12 pb-6">
                <div className="max-w-full">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : filteredKbs.length === 0 ? (
                        <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-gray-300">
                            <div className="bg-gray-100 p-4 rounded-full">
                                <LayoutGrid size={32} strokeWidth={1.5} className="text-gray-400" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-sm font-medium text-gray-600">空空如也</div>
                                <div className="text-xs text-gray-400">去创建一个新的知识库吧</div>
                            </div>
                            <Button variant="light" color="primary" className="font-medium text-[#155EEF]" onPress={onOpen}>
                                创建知识库
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredKbs.map((kb) => (
                                <Link href={`/knowledge/${kb.id}`} key={kb.id} className="block group h-full">
                                    <div className="relative flex flex-col h-full bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer">
                                        {/* Header */}
                                        <div className="flex items-start gap-4 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#FFF2F2] border border-[#FFE4E4] flex items-center justify-center flex-shrink-0 text-xl">
                                                📙
                                            </div>
                                            <div className="flex-1 min-w-0 py-0.5">
                                                <h3 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-[#155EEF] transition-colors">
                                                    {kb.name}
                                                </h3>
                                                <div className="flex items-center">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase tracking-wider">
                                                        文本数据
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                {kb.description || "暂无描述"}
                                            </p>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <FileText size={12} />
                                                    <span className="font-medium">{kb.document_count}</span>
                                                    <span>文档</span>
                                                </div>
                                                <span className="text-gray-300">|</span>
                                                <span>{new Date(kb.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Dropdown>
                                                <DropdownTrigger>
                                                    <div className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}>
                                                        <MoreHorizontal size={16} />
                                                    </div>
                                                </DropdownTrigger>
                                                <DropdownMenu>
                                                    <DropdownItem
                                                        key="delete"
                                                        className="text-danger"
                                                        color="danger"
                                                        startContent={<Trash2 size={14} />}
                                                        onPress={() => deleteKnowledgeBase(kb.id)}
                                                    >
                                                        删除
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                size="2xl"
                classNames={{
                    base: "bg-white rounded-2xl",
                    header: "px-8 pt-8 pb-4",
                    body: "px-8 pb-8",
                    footer: "px-8 pb-8 pt-0 border-0"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <h2 className="text-xl font-semibold text-gray-900">创建知识库</h2>
                    </ModalHeader>
                    <ModalBody className="gap-6">
                        <Input
                            label="名称"
                            placeholder="输入知识库名称"
                            value={newName}
                            onValueChange={setNewName}
                            labelPlacement="outside"
                            variant="bordered"
                            radius="md"
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                inputWrapper: "h-10 border-gray-300"
                            }}
                        />
                        <Textarea
                            label="描述"
                            placeholder="输入知识库描述（可选）"
                            value={newDescription}
                            onValueChange={setNewDescription}
                            labelPlacement="outside"
                            variant="bordered"
                            radius="md"
                            minRows={3}
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                inputWrapper: "border-gray-300"
                            }}
                        />

                        <Select
                            label="Embedding 模型"
                            placeholder="选择嵌入模型"
                            selectedKeys={selectedModel}
                            onSelectionChange={setSelectedModel}
                            labelPlacement="outside"
                            variant="bordered"
                            radius="md"
                            startContent={<Cpu size={18} className="text-gray-400" />}
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                trigger: "h-10 border-gray-300 data-[hover=true]:border-gray-400 bg-white",
                                value: "text-gray-800"
                            }}
                        >
                            {embeddingModels.map((item) => (
                                <SelectItem key={`${item.provider}:${item.model}`} textValue={item.name}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </Select>

                        <Select
                            label="Rerank 模型 (可选)"
                            placeholder="选择重排序模型"
                            selectedKeys={selectedRerankModel}
                            onSelectionChange={setSelectedRerankModel}
                            labelPlacement="outside"
                            variant="bordered"
                            radius="md"
                            startContent={<Filter size={18} className="text-gray-400" />}
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                trigger: "h-10 border-gray-300 data-[hover=true]:border-gray-400 bg-white",
                                value: "text-gray-800"
                            }}
                        >
                            {rerankModels.map((item) => (
                                <SelectItem key={`${item.provider}:${item.model}`} textValue={item.name}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </Select>
                        {/* 简化检索模式选择，暂时隐藏高级配置，保持界面清爽 */}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onClose} className="font-medium text-gray-600">
                            取消
                        </Button>
                        <Button
                            color="primary"
                            className="bg-[#155EEF] font-medium"
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
