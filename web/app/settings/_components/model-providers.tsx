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
    Chip,
    Card,
    CardBody,
    Spinner,
    Accordion,
    AccordionItem,
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
    Link,
    Tooltip
} from "@heroui/react";
import { Plus, Trash2, Edit2, Server, Key, Box, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProviderModel {
    id: number;
    name: string;
    description?: string;
    model_type: string;
    enabled: boolean;
    config: Record<string, any>;
    created_at: string;
}

interface ModelProvider {
    id: number;
    name: string;
    description?: string;
    api_base?: string;
    enabled: boolean;
    config: Record<string, any>;
    models: ProviderModel[];
    created_at: string;
}

const MODEL_TYPES = [
    { label: "LLM", value: "llm" },
    { label: "Embedding", value: "embedding" },
    { label: "Rerank", value: "rerank" },
    { label: "TTS", value: "tts" },
];

export default function ModelProviderSettings() {
    const [providers, setProviders] = useState<ModelProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Provider Modal
    const {
        isOpen: isProviderOpen,
        onOpen: onProviderOpen,
        onOpenChange: onProviderOpenChange
    } = useDisclosure();
    const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null);

    // Model Modal
    const {
        isOpen: isModelOpen,
        onOpen: onModelOpen,
        onOpenChange: onModelOpenChange
    } = useDisclosure();
    const [selectedProvider, setSelectedProvider] = useState<ModelProvider | null>(null);

    // Form States
    const [providerForm, setProviderForm] = useState({
        name: "",
        description: "",
        api_key: "",
        api_base: "",
    });

    const [modelForm, setModelForm] = useState({
        name: "",
        description: "",
        model_type: "llm",
    });

    const fetchProviders = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers`);
            if (res.ok) {
                const data = await res.json();
                setProviders(data);
            }
        } catch (error) {
            toast.error("Failed to load providers");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    // --- Provider Handlers ---

    const handleProviderSubmit = async (onClose: () => void) => {
        try {
            const url = editingProvider
                ? `${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers/${editingProvider.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers`;

            const method = editingProvider ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: providerForm.name,
                    description: providerForm.description,
                    api_key: providerForm.api_key,
                    api_base: providerForm.api_base || null
                }),
            });

            if (!res.ok) throw new Error("Operation failed");

            toast.success(editingProvider ? "Provider updated" : "Provider created");
            fetchProviders();
            onClose();
        } catch (error) {
            toast.error("Failed to save provider");
        }
    };

    const handleProviderDelete = async (id: number) => {
        if (!confirm("Delete this provider and all its models?")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Provider deleted");
            fetchProviders();
        } catch (error) {
            toast.error("Failed to delete provider");
        }
    };

    const openProviderEdit = (provider: ModelProvider) => {
        setEditingProvider(provider);
        setProviderForm({
            name: provider.name,
            description: provider.description || "",
            api_key: "",
            api_base: provider.api_base || "",
        });
        onProviderOpen();
    };

    const openProviderCreate = () => {
        setEditingProvider(null);
        setProviderForm({
            name: "",
            description: "",
            api_key: "",
            api_base: "",
        });
        onProviderOpen();
    };

    // --- Model Handlers ---

    const handleModelSubmit = async (onClose: () => void) => {
        if (!selectedProvider) return;
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers/${selectedProvider.id}/models`;

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(modelForm),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Operation failed");
            }

            toast.success("Model added");
            fetchProviders();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleModelDelete = async (id: number) => {
        if (!confirm("Remove this model?")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/models/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Model removed");
            fetchProviders();
        } catch (error) {
            toast.error("Failed to remove model");
        }
    };

    const openModelCreate = (provider: ModelProvider) => {
        setSelectedProvider(provider);
        setModelForm({
            name: "",
            description: "",
            model_type: "llm",
        });
        onModelOpen();
    };


    if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">模型提供商</h2>
                    <p className="text-sm text-default-500">配置模型服务及其具体模型。</p>
                </div>
                <Button color="primary" startContent={<Plus size={18} />} onPress={openProviderCreate}>
                    添加提供商
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {providers.map((provider) => (
                    <Card key={provider.id} className="border border-default-200 shadow-sm">
                        <CardBody className="p-0">
                            <div className="flex items-center justify-between p-4 bg-default-50 border-b border-default-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-lg">{provider.name}</span>
                                            {provider.enabled ? (
                                                <Chip size="sm" variant="dot" color="success" classNames={{ base: "h-5", content: "px-1" }}>Active</Chip>
                                            ) : (
                                                <Chip size="sm" variant="dot" color="default" classNames={{ base: "h-5", content: "px-1" }}>Inactive</Chip>
                                            )}
                                        </div>
                                        {provider.description && (
                                            <div className="text-sm text-default-500 mt-0.5 max-w-[400px] truncate" title={provider.description}>
                                                {provider.description}
                                            </div>
                                        )}
                                        {provider.api_base && (
                                            <div className="text-xs text-default-400 font-mono mt-0.5 max-w-[300px] truncate" title={provider.api_base}>
                                                {provider.api_base}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        color="secondary"
                                        startContent={<Plus size={16} />}
                                        onPress={() => openModelCreate(provider)}
                                    >
                                        添加模型
                                    </Button>
                                    <Button isIconOnly size="sm" variant="light" onPress={() => openProviderEdit(provider)}>
                                        <Settings size={18} />
                                    </Button>
                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleProviderDelete(provider.id)}>
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4">
                                {provider.models.length === 0 ? (
                                    <div className="text-center text-default-400 py-4 text-sm">
                                        暂无模型配置，请点击右上角添加模型。
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {provider.models.map(model => (
                                            <div key={model.id} className="group relative border border-default-200 rounded-lg p-3 hover:border-primary/50 transition-colors bg-content2/20">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Chip size="sm" variant="flat" color="primary" className="capitalize text-xs h-6">{model.model_type}</Chip>
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger/10 p-1 rounded"
                                                        onClick={() => handleModelDelete(model.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="font-medium text-sm truncate" title={model.name}>
                                                    {model.name}
                                                </div>
                                                {model.description && (
                                                    <div className="text-xs text-default-400 truncate mt-0.5" title={model.description}>
                                                        {model.description}
                                                    </div>
                                                )}
                                                <div className="text-xs text-default-400 mt-1">
                                                    {format(new Date(model.created_at), "yyyy-MM-dd")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Provider Modal */}
            <Modal isOpen={isProviderOpen} onOpenChange={onProviderOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                <div className="flex items-center gap-2">
                                    <Server size={20} />
                                    {editingProvider ? "配置提供商" : "添加提供商"}
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <Input
                                    label="名称"
                                    placeholder="例如: openai, dashscope"
                                    value={providerForm.name}
                                    onValueChange={(v) => setProviderForm({ ...providerForm, name: v })}
                                    isDisabled={!!editingProvider}
                                    startContent={<Box size={18} className="text-default-400" />}
                                />

                                <Input
                                    label="描述 (可选)"
                                    placeholder="备注说明..."
                                    value={providerForm.description}
                                    onValueChange={(v) => setProviderForm({ ...providerForm, description: v })}
                                />

                                <Input
                                    label="API Key"
                                    placeholder={editingProvider ? "如果不修改请留空" : "sk-..."}
                                    type="password"
                                    value={providerForm.api_key}
                                    onValueChange={(v) => setProviderForm({ ...providerForm, api_key: v })}
                                    startContent={<Key size={18} className="text-default-400" />}
                                />

                                <Input
                                    label="API Base URL (可选)"
                                    placeholder="https://api.openai.com/v1"
                                    value={providerForm.api_base}
                                    onValueChange={(v) => setProviderForm({ ...providerForm, api_base: v })}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button color="primary" onPress={() => handleProviderSubmit(onClose)}>
                                    保存
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Model Modal */}
            <Modal isOpen={isModelOpen} onOpenChange={onModelOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                <div className="flex items-center gap-2">
                                    <Plus size={20} />
                                    添加模型
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="mb-2">
                                    <div className="text-sm text-default-500 mb-1">所属提供商</div>
                                    <div className="font-semibold text-lg">{selectedProvider?.name}</div>
                                </div>

                                <Input
                                    autoFocus
                                    label="模型名称"
                                    placeholder="例如: gpt-4o, text-embedding-3-small"
                                    value={modelForm.name}
                                    onValueChange={(v) => setModelForm({ ...modelForm, name: v })}
                                />

                                <Input
                                    label="描述 (可选)"
                                    placeholder="模型说明..."
                                    value={modelForm.description}
                                    onValueChange={(v) => setModelForm({ ...modelForm, description: v })}
                                />

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-default-600">模型类型</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {MODEL_TYPES.map(type => (
                                            <div
                                                key={type.value}
                                                className={`
                                            cursor-pointer border rounded-lg px-3 py-2 text-sm text-center transition-all
                                            ${modelForm.model_type === type.value
                                                        ? "border-primary bg-primary/10 text-primary font-medium"
                                                        : "border-default-200 hover:border-default-400 text-default-600"
                                                    }
                                        `}
                                                onClick={() => setModelForm({ ...modelForm, model_type: type.value })}
                                            >
                                                {type.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button color="primary" onPress={() => handleModelSubmit(onClose)}>
                                    添加
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
