import { useState } from "react";
import {
    Bot,
    Settings,
} from "lucide-react";
import {
    Chip,
    Select,
    SelectItem,
    Button,
    Tooltip,
    useDisclosure
} from "@heroui/react";
import { ModelParamsModal } from "../workflow/modals/model-params-modal";
import type { ProviderModel } from "@/lib/types";

interface AgentModelSelectProps {
    models: ProviderModel[];
    modelConfig: Record<string, any>;
    setModelConfig: (config: Record<string, any>) => void;
}

export function AgentModelSelect({ models, modelConfig, setModelConfig }: AgentModelSelectProps) {
    const { isOpen: isModelParamsOpen, onOpen: onModelParamsOpen, onOpenChange: onModelParamsOpenChange } = useDisclosure();

    return (
        <div className="p-4 border-b border-divider space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-content2/50 border border-divider shadow-sm">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                    <Bot size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-foreground">ReAct Agent</span>
                        <Chip size="sm" variant="flat" color="success" className="text-[8px] h-3.5 px-1 font-bold">
                            推荐
                        </Chip>
                    </div>
                    <div className="text-[10px] text-foreground/60 leading-tight">
                        基于 <span className="font-medium text-foreground/80">推理-行动 (Reasoning-Action)</span> 循环。
                    </div>
                </div>
            </div>

            {/* 模型选择 */}
            <div className="flex items-center gap-2">
                <Select
                    label="选择模型"
                    size="sm"
                    variant="flat"
                    placeholder="Select a model"
                    selectedKeys={(() => {
                        const current = models.find(
                            m => m.provider === modelConfig.provider && m.name === modelConfig.model
                        );
                        // Ensure we return a valid key or empty set
                        return current ? new Set([String(current.id)]) : new Set();
                    })()}
                    onChange={(e) => {
                        const selected = models.find(m => String(m.id) === e.target.value);
                        if (selected) {
                            setModelConfig({
                                ...modelConfig,
                                provider: selected.provider,
                                model: selected.name,
                            });
                        }
                    }}
                    classNames={{
                        trigger: "h-9 min-h-9 bg-content2/50 hover:bg-content2/80 transition-colors",
                        value: "text-xs font-medium",
                    }}
                    labelPlacement="outside-left"
                >
                    {models.map((m) => (
                        <SelectItem key={m.id} textValue={m.name}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{m.name}</span>
                                <span className="text-[10px] text-foreground-400">({m.provider})</span>
                            </div>
                        </SelectItem>
                    ))}
                </Select>
                <Tooltip content="模型参数">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-9 w-9 text-foreground-500 hover:text-primary"
                        onPress={onModelParamsOpen}
                    >
                        <Settings size={16} />
                    </Button>
                </Tooltip>
            </div>

            {/* Model Params Modal */}
            <ModelParamsModal
                isOpen={isModelParamsOpen}
                onOpenChange={onModelParamsOpenChange}
                data={modelConfig.parameters || {}}
                onChange={(patch) => setModelConfig({ ...modelConfig, parameters: { ...(modelConfig.parameters || {}), ...patch } })}
            />
        </div>
    );
}
