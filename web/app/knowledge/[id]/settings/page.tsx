"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Button,
    Input,
    Textarea,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Spinner,
} from "@heroui/react";
import { Save, ChevronDown, User, FileText, Database, Sliders } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeBase {
    id: number;
    name: string;
    description: string | null;
    embedding_provider: string;
    embedding_model: string | null;
    rerank_provider: string | null;
    rerank_model: string | null;
    retrieval_mode: string;
    document_count: number;
    word_count: number;
    created_at: string;
    updated_at: string;
    indexing_config: {
        chunk_size?: number;
        chunk_overlap?: number;
    } | null;
}

interface ModelOption {
    provider: string;
    model: string;
    name: string;
}

const retrievalModes = [
    { key: "hybrid", label: "混合检索", description: "结合语义和关键词" },
    { key: "semantic", label: "语义检索", description: "向量相似度" },
    { key: "keyword", label: "关键词检索", description: "BM25" },
];

export default function SettingsPage() {
    const params = useParams();
    const kbId = params.id as string;

    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [retrievalMode, setRetrievalMode] = useState("hybrid");
    const [chunkSize, setChunkSize] = useState("500");
    const [chunkOverlap, setChunkOverlap] = useState("50");

    // Rerank 模型设置
    const [rerankModels, setRerankModels] = useState<ModelOption[]>([]);
    const [selectedRerankModel, setSelectedRerankModel] = useState<string | null>(null);

    useEffect(() => {
        loadKnowledgeBase();
        loadRerankModels();
    }, [kbId]);

    async function loadRerankModels() {
        try {
            const resp = await fetch("/api/settings/model-providers");
            if (resp.ok) {
                const providers = await resp.json();
                const rerankOptions: ModelOption[] = [];
                for (const p of providers) {
                    if (p.models) {
                        for (const m of p.models) {
                            if (m.model_type === "rerank" && m.enabled) {
                                rerankOptions.push({
                                    provider: p.name,
                                    model: m.name,
                                    name: `${p.name}/${m.name}`
                                });
                            }
                        }
                    }
                }
                setRerankModels(rerankOptions);
            }
        } catch (e) {
            console.error("Failed to load rerank models:", e);
        }
    }

    async function loadKnowledgeBase() {
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/detail`);
            if (resp.ok) {
                const data: KnowledgeBase = await resp.json();
                setKb(data);
                setName(data.name);
                setDescription(data.description || "");
                setRetrievalMode(data.retrieval_mode);
                if (data.indexing_config) {
                    setChunkSize(data.indexing_config.chunk_size?.toString() || "500");
                    setChunkOverlap(data.indexing_config.chunk_overlap?.toString() || "50");
                }
                // 设置 rerank 模型
                if (data.rerank_provider && data.rerank_model) {
                    setSelectedRerankModel(`${data.rerank_provider}:${data.rerank_model}`);
                }
            }
        } catch (e) {
            console.error("Failed to load:", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    retrieval_mode: retrievalMode,
                    indexing_config: {
                        chunk_size: parseInt(chunkSize) || 500,
                        chunk_overlap: parseInt(chunkOverlap) || 50
                    },
                    rerank_provider: selectedRerankModel ? selectedRerankModel.split(":")[0] : null,
                    rerank_model: selectedRerankModel ? selectedRerankModel.split(":")[1] : null
                }),
            });

            if (resp.ok) {
                const data = await resp.json();
                setKb(data);
                toast.success("保存成功");
            } else {
                toast.error("保存失败");
            }
        } catch (e) {
            console.error("Save failed:", e);
            toast.error("保存失败");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!kb) return null;

    const selectedMode = retrievalModes.find(m => m.key === retrievalMode);

    return (
        <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
                    <p className="text-sm text-gray-500 mt-1">配置知识库的基本信息和检索策略。</p>
                </div>

                {/* 基本信息 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <User size={18} className="text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">基本信息</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <Input
                            label="名称"
                            placeholder="输入知识库名称"
                            value={name}
                            onValueChange={setName}
                            labelPlacement="outside"
                            variant="bordered"
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                inputWrapper: "border-gray-300"
                            }}
                        />
                        <Textarea
                            label="描述"
                            placeholder="输入描述（可选）"
                            value={description}
                            onValueChange={setDescription}
                            labelPlacement="outside"
                            variant="bordered"
                            minRows={3}
                            classNames={{
                                label: "text-sm font-medium text-gray-700 mb-1",
                                inputWrapper: "border-gray-300"
                            }}
                        />
                    </div>
                </div>

                {/* 分段配置 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <FileText size={18} className="text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分段配置</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            <Input
                                type="number"
                                label="分段长度 (Tokens)"
                                placeholder="500"
                                value={chunkSize}
                                onValueChange={setChunkSize}
                                labelPlacement="outside"
                                variant="bordered"
                                description="默认值为 500。每个分段的最大 Token 数量。"
                                classNames={{
                                    label: "text-sm font-medium text-gray-700 mb-1",
                                    inputWrapper: "border-gray-300"
                                }}
                            />
                            <Input
                                type="number"
                                label="分段重叠 (Overlap)"
                                placeholder="50"
                                value={chunkOverlap}
                                onValueChange={setChunkOverlap}
                                labelPlacement="outside"
                                variant="bordered"
                                description="默认值为 50。相邻分段之间的重叠 Token 数量。"
                                classNames={{
                                    label: "text-sm font-medium text-gray-700 mb-1",
                                    inputWrapper: "border-gray-300"
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* 检索配置 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Sliders size={18} className="text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">检索配置</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">默认检索模式</label>
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        variant="bordered"
                                        size="md"
                                        className="w-full justify-between text-left h-10 border-gray-300"
                                        endContent={<ChevronDown size={16} className="text-gray-400" />}
                                    >
                                        <div className="flex flex-col items-start text-sm">
                                            {selectedMode?.label}
                                        </div>
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu onAction={(key) => setRetrievalMode(key as string)}>
                                    {retrievalModes.map(mode => (
                                        <DropdownItem key={mode.key} description={mode.description}>
                                            {mode.label}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                            <p className="text-xs text-gray-500 mt-1">此模式将作为该知识库被引用时的默认检索策略。</p>
                        </div>

                        {/* Rerank 模型设置 */}
                        <div className="flex flex-col gap-2 mt-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rerank 模型</label>
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        variant="bordered"
                                        size="md"
                                        className="w-full justify-between text-left h-10 border-gray-300"
                                        endContent={<ChevronDown size={16} className="text-gray-400" />}
                                    >
                                        <div className="flex flex-col items-start text-sm">
                                            {selectedRerankModel
                                                ? rerankModels.find(m => `${m.provider}:${m.model}` === selectedRerankModel)?.name || selectedRerankModel
                                                : "无 (不启用重排序)"}
                                        </div>
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    onAction={(key) => setSelectedRerankModel(key === "none" ? null : key as string)}
                                    selectionMode="single"
                                    selectedKeys={selectedRerankModel ? new Set([selectedRerankModel]) : new Set(["none"])}
                                >
                                    <DropdownItem key="none">无 (不启用重排序)</DropdownItem>
                                    {rerankModels.map(m => (
                                        <DropdownItem key={`${m.provider}:${m.model}`}>
                                            {m.name}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                            <p className="text-xs text-gray-500 mt-1">选择用于结果重排序的模型。重排序可提升检索结果的相关性。</p>
                        </div>
                    </div>
                </div>

                {/* 技术参数（只读） */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Database size={18} className="text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">技术参数</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">嵌入模型 (Embedding)</span>
                                <div className="font-medium text-sm text-gray-900">{kb.embedding_provider}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{kb.embedding_model || "Default"}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-xs text-gray-500 block mb-1">当前数据量</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-mono font-medium text-gray-900">{kb.document_count}</span>
                                    <span className="text-xs text-gray-500">文档</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="font-mono font-medium text-gray-900">{kb.word_count.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500">字符</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-4">
                    <Button
                        size="md"
                        className="bg-[#155EEF] text-white px-8 font-medium shadow-md shadow-blue-500/20"
                        startContent={<Save size={16} />}
                        onPress={handleSave}
                        isLoading={saving}
                    >
                        保存更改
                    </Button>
                </div>
            </div>
        </div>
    );
}
