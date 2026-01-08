"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Input,
    Textarea,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Spinner,
    Divider,
    addToast,
} from "@heroui/react";
import { Settings, Save, ChevronDown } from "lucide-react";

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

const retrievalModes = [
    { key: "hybrid", label: "混合检索", description: "结合语义和关键词检索" },
    { key: "semantic", label: "语义检索", description: "基于向量相似度检索" },
    { key: "keyword", label: "关键词检索", description: "基于 BM25 关键词匹配" },
];

export default function SettingsPage() {
    const params = useParams();
    const kbId = params.id as string;

    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 表单状态
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [retrievalMode, setRetrievalMode] = useState("hybrid");

    useEffect(() => {
        loadKnowledgeBase();
    }, [kbId]);

    async function loadKnowledgeBase() {
        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/detail`);
            if (resp.ok) {
                const data: KnowledgeBase = await resp.json();
                setKb(data);
                setName(data.name);
                setDescription(data.description || "");
                setRetrievalMode(data.retrieval_mode);
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
                }),
            });

            if (resp.ok) {
                const data = await resp.json();
                setKb(data);
                alert("保存成功");
            } else {
                alert("保存失败");
            }
        } catch (e) {
            console.error("Save failed:", e);
            alert("保存失败");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!kb) {
        return (
            <div className="flex items-center justify-center py-20">
                <p>知识库不存在</p>
            </div>
        );
    }

    const selectedMode = retrievalModes.find(m => m.key === retrievalMode);

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-xl font-bold">知识库设置</h2>
                <p className="text-sm text-foreground-500">管理知识库的基本信息和检索配置</p>
            </div>

            {/* 基本信息 */}
            <Card>
                <CardHeader className="pb-0">
                    <span className="font-semibold">基本信息</span>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Input
                        label="名称"
                        placeholder="输入知识库名称"
                        value={name}
                        onValueChange={setName}
                        variant="bordered"
                    />
                    <Textarea
                        label="描述"
                        placeholder="输入知识库描述（可选）"
                        value={description}
                        onValueChange={setDescription}
                        variant="bordered"
                    />
                </CardBody>
            </Card>

            {/* 嵌入模型 */}
            <Card>
                <CardHeader className="pb-0">
                    <span className="font-semibold">嵌入模型</span>
                </CardHeader>
                <CardBody>
                    <div className="p-4 rounded-lg bg-content2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{kb.embedding_provider}</p>
                                <p className="text-sm text-foreground-500">
                                    {kb.embedding_model || "默认模型"}
                                </p>
                            </div>
                            <div className="text-xs text-foreground-400">
                                创建后不可更改
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* 检索设置 */}
            <Card>
                <CardHeader className="pb-0">
                    <span className="font-semibold">检索设置</span>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div>
                        <label className="text-sm font-medium block mb-2">检索模式</label>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button
                                    variant="bordered"
                                    className="w-full justify-between"
                                    endContent={<ChevronDown size={16} />}
                                >
                                    <div className="text-left">
                                        <div>{selectedMode?.label}</div>
                                        <div className="text-xs text-foreground-500">
                                            {selectedMode?.description}
                                        </div>
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
                    </div>
                </CardBody>
            </Card>

            {/* 统计信息 */}
            <Card>
                <CardHeader className="pb-0">
                    <span className="font-semibold">统计信息</span>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-content2">
                            <p className="text-2xl font-bold">{kb.document_count}</p>
                            <p className="text-sm text-foreground-500">文档数</p>
                        </div>
                        <div className="p-4 rounded-lg bg-content2">
                            <p className="text-2xl font-bold">{kb.word_count.toLocaleString()}</p>
                            <p className="text-sm text-foreground-500">总字符数</p>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* 保存按钮 */}
            <div className="flex justify-end">
                <Button
                    color="primary"
                    startContent={<Save size={16} />}
                    onPress={handleSave}
                    isLoading={saving}
                >
                    保存设置
                </Button>
            </div>
        </div>
    );
}
