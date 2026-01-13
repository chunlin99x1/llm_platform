/**
 * 模型选择器组件
 * 
 * 支持按类型筛选模型（LLM、Embedding、Rerank 等），
 * 从 /settings/model-providers 获取数据。
 */

"use client";

import { useMemo } from "react";
import { Select, SelectItem, Chip } from "@heroui/react";
import { useModelsByType } from "@/hooks/use-api";
import type { Selection } from "@heroui/react";

// ============== 类型定义 ==============

interface ProviderModel {
    id: number;
    name: string;
    description?: string;
    model_type: string;
    enabled: boolean;
}

interface ModelProvider {
    id: number;
    name: string;
    description?: string;
    enabled: boolean;
    models: ProviderModel[];
}

interface ModelSelectorProps {
    modelType?: "llm" | "embedding" | "rerank" | "tts";
    value?: string;
    onChange?: (modelId: string, provider: string, model: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}

// ============== 组件 ==============

export function ModelSelector({
    modelType = "llm",
    value,
    onChange,
    placeholder = "选择模型",
    label = "模型",
    disabled = false,
    className = "",
}: ModelSelectorProps) {
    const { data: providers, loading, error } = useModelsByType(modelType);

    // 构建选项列表
    const options = useMemo(() => {
        if (!providers || !Array.isArray(providers)) return [];

        const items: { key: string; label: string; provider: string; model: string; description?: string }[] = [];

        providers.forEach((provider: ModelProvider) => {
            if (!provider.enabled) return;

            provider.models?.forEach((model) => {
                if (!model.enabled) return;

                const key = `${provider.name}/${model.name}`;
                items.push({
                    key,
                    label: model.name,
                    provider: provider.name,
                    model: model.name,
                    description: model.description || provider.description,
                });
            });
        });

        return items;
    }, [providers]);

    // 按提供商分组
    const groupedOptions = useMemo(() => {
        const groups: Record<string, typeof options> = {};
        options.forEach((opt) => {
            if (!groups[opt.provider]) {
                groups[opt.provider] = [];
            }
            groups[opt.provider].push(opt);
        });
        return groups;
    }, [options]);

    const handleSelectionChange = (keys: Selection) => {
        const selectedKey = Array.from(keys)[0] as string;
        if (selectedKey && onChange) {
            const selected = options.find((opt) => opt.key === selectedKey);
            if (selected) {
                onChange(selectedKey, selected.provider, selected.model);
            }
        }
    };

    if (error) {
        return (
            <div className={`text-red-500 text-sm ${className}`}>
                加载模型失败: {error.message}
            </div>
        );
    }

    return (
        <Select
            label={label}
            placeholder={loading ? "加载中..." : placeholder}
            selectedKeys={value ? [value] : []}
            onSelectionChange={handleSelectionChange}
            isDisabled={disabled || loading}
            isLoading={loading}
            className={className}
            classNames={{
                trigger: "min-h-[40px]",
                value: "text-sm",
            }}
        >
            {options.map((option) => (
                <SelectItem
                    key={option.key}
                    textValue={option.label}
                    startContent={
                        <Chip size="sm" variant="flat" color="primary" className="text-[10px]">
                            {option.provider}
                        </Chip>
                    }
                >
                    <div className="flex flex-col">
                        <span className="text-sm">{option.label}</span>
                        {option.description && (
                            <span className="text-xs text-gray-400">{option.description}</span>
                        )}
                    </div>
                </SelectItem>
            ))}
        </Select>
    );
}

// ============== 快捷选择器 ==============

interface QuickModelSelectorProps {
    type: "llm" | "embedding" | "rerank";
    value?: { provider?: string; model?: string };
    onChange?: (value: { provider: string; model: string }) => void;
    className?: string;
}

export function QuickModelSelector({
    type,
    value,
    onChange,
    className = "",
}: QuickModelSelectorProps) {
    const currentKey = value?.provider && value?.model
        ? `${value.provider}/${value.model}`
        : undefined;

    const labels: Record<string, string> = {
        llm: "LLM 模型",
        embedding: "Embedding 模型",
        rerank: "Rerank 模型",
    };

    return (
        <ModelSelector
            modelType={type}
            value={currentKey}
            onChange={(_, provider, model) => {
                onChange?.({ provider, model });
            }}
            label={labels[type] || "模型"}
            className={className}
        />
    );
}

export default ModelSelector;
