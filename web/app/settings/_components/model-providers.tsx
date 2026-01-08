"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Card, CardBody, Spinner } from "@heroui/react";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ModelProvider {
    id: number;
    name: string;
    provider_type: string;
    api_base?: string;
    enabled: boolean;
    config: Record<string, any>;
    created_at: string;
}

const PROVIDER_TYPES = [
    { label: "LLM (OpenAI Compatible)", value: "llm" },
    { label: "Embedding", value: "embedding" },
    { label: "Rerank", value: "rerank" },
    { label: "TTS", value: "tts" },
];

export default function ModelProviderSettings() {
    const [providers, setProviders] = useState<ModelProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        provider_type: "llm",
        api_key: "",
        api_base: "",
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

    const handleSubmit = async (onClose: () => void) => {
        try {
            const url = editingProvider
                ? `${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers/${editingProvider.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/settings/model-providers`;

            const method = editingProvider ? "PUT" : "POST";

            const body = {
                ...formData,
                api_base: formData.api_base || null,
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Operation failed");

            toast.success(editingProvider ? "Provider updated" : "Provider created");
            fetchProviders();
            onClose();
        } catch (error) {
            toast.error("Failed to save provider");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this provider?")) return;

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

    const openEdit = (provider: ModelProvider) => {
        setEditingProvider(provider);
        setFormData({
            name: provider.name,
            provider_type: provider.provider_type,
            api_key: "", // Don't show existing API key for security
            api_base: provider.api_base || "",
        });
        onOpen();
    };

    const openCreate = () => {
        setEditingProvider(null);
        setFormData({
            name: "",
            provider_type: "llm",
            api_key: "",
            api_base: "",
        });
        onOpen();
    };

    if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">模型提供商</h2>
                    <p className="text-sm text-default-500">配置用于推理、嵌入和重排序的模型服务。</p>
                </div>
                <Button color="primary" startContent={<Plus size={18} />} onPress={openCreate}>
                    添加提供商
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => (
                    <Card key={provider.id} className="border border-default-200 shadow-sm">
                        <CardBody className="flex flex-row justify-between items-center gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">{provider.name}</span>
                                    <Chip size="sm" variant="flat" color="secondary" className="capitalize">
                                        {provider.provider_type}
                                    </Chip>
                                    {provider.enabled ? (
                                        <Chip size="sm" variant="dot" color="success">Enabled</Chip>
                                    ) : (
                                        <Chip size="sm" variant="dot" color="default">Disabled</Chip>
                                    )}
                                </div>
                                {provider.api_base && (
                                    <code className="text-xs bg-default-100 px-1 py-0.5 rounded w-fit text-default-500">
                                        {provider.api_base}
                                    </code>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(provider)}>
                                    <Edit2 size={16} />
                                </Button>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(provider.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{editingProvider ? "编辑提供商" : "添加提供商"}</ModalHeader>
                            <ModalBody>
                                <Input
                                    label="名称"
                                    placeholder="例如: openai, dashscope"
                                    value={formData.name}
                                    onValueChange={(v) => setFormData({ ...formData, name: v })}
                                    isDisabled={!!editingProvider} // Name is unique key
                                />

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm">类型</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PROVIDER_TYPES.map(type => (
                                            <div
                                                key={type.value}
                                                className={`
                                                    cursor-pointer border rounded-lg px-3 py-2 text-sm text-center transition-all
                                                    ${formData.provider_type === type.value
                                                        ? "border-primary bg-primary/10 text-primary font-medium"
                                                        : "border-default-200 hover:border-default-400 text-default-600"
                                                    }
                                                    ${editingProvider ? "opacity-50 cursor-not-allowed" : ""}
                                                `}
                                                onClick={() => !editingProvider && setFormData({ ...formData, provider_type: type.value })}
                                            >
                                                {type.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Input
                                    label="API Key"
                                    placeholder={editingProvider ? "如果不修改请留空" : "sk-..."}
                                    type="password"
                                    value={formData.api_key}
                                    onValueChange={(v) => setFormData({ ...formData, api_key: v })}
                                />

                                <Input
                                    label="API Base URL (可选)"
                                    placeholder="https://api.openai.com/v1"
                                    value={formData.api_base}
                                    onValueChange={(v) => setFormData({ ...formData, api_base: v })}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button color="primary" onPress={() => handleSubmit(onClose)}>
                                    保存
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
