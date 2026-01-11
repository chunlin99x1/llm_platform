import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Textarea
} from "@heroui/react";
import {
    Box,
    Settings,
    Terminal,
    Variable
} from "lucide-react";
import { useState } from "react";
import type { Node, Edge } from "reactflow";
import { ModelParamsModal } from "../modals/model-params-modal";
import { VariableSelector } from "../../workflow-variable-selector";

export function LLMNodeConfig({
    selectedNode,
    updateSelectedNode,
    nodes,
    edges,
    models
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    edges: Edge[];
    models: any[];
}) {
    const [isModelParamsModalOpen, setIsModelParamsModalOpen] = useState(false);
    const onModelParamsModalOpenChange = () => setIsModelParamsModalOpen(!isModelParamsModalOpen);

    return (
        <section className="flex flex-col gap-4">
            {/* 模型选择 */}
            <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                    <Box size={10} />
                    模型
                </div>
                <Dropdown>
                    <DropdownTrigger>
                        <Button
                            variant="bordered"
                            size="sm"
                            className="justify-between h-9 text-[11px] w-full"
                        >
                            {selectedNode.data?.modelConfig?.model || "选择模型"}
                            <span className="text-foreground-400">▼</span>
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="选择模型"
                        onAction={(key) => {
                            // key format: provider:name
                            const [p, n] = (key as string).split(":");
                            const selected = models.find(m => m.provider === p && m.name === n);

                            if (selected) {
                                const currentConfig = selectedNode.data?.modelConfig || {};
                                updateSelectedNode({
                                    modelConfig: {
                                        ...currentConfig,
                                        provider: selected.provider,
                                        model: selected.name,
                                        parameters: currentConfig.parameters || {}
                                    }
                                });
                            }
                        }}
                    >
                        {models.map((m) => (
                            <DropdownItem key={`${m.provider}:${m.name}`}>
                                {m.name}
                                <span className="text-[9px] text-foreground-400 ml-1">({m.provider})</span>
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </Dropdown>
            </div>

            {/* 参数设置 */}
            <div className="flex flex-col gap-3">
                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                    <Settings size={10} />
                    参数
                </div>
                <Button
                    size="sm"
                    variant="flat"
                    className="w-full h-8 text-[11px] justify-between px-3 bg-content2/50 hover:bg-content2"
                    onPress={onModelParamsModalOpenChange}
                    endContent={<Settings size={12} className="text-foreground-500" />}
                >
                    <span className="text-foreground-600">
                        {(() => {
                            const params = selectedNode.data?.modelConfig?.parameters || {};
                            return `Temp: ${params.temperature ?? 0.7} / Max: ${params.max_tokens ?? 2048}`
                        })()}
                    </span>
                </Button>

                {/* 模型参数模态框 */}
                <ModelParamsModal
                    isOpen={isModelParamsModalOpen}
                    onOpenChange={onModelParamsModalOpenChange}
                    data={selectedNode.data?.modelConfig?.parameters || {}}
                    onChange={(patch) => {
                        const currentConfig = selectedNode.data?.modelConfig || {};
                        updateSelectedNode({
                            modelConfig: {
                                ...currentConfig,
                                parameters: { ...currentConfig.parameters, ...patch }
                            }
                        });
                    }}
                    modelConfig={models.find(m => m.provider === selectedNode.data?.modelConfig?.provider && m.name === selectedNode.data?.modelConfig?.model)?.config}
                />
            </div>

            {/* Prompt */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                        <Terminal size={10} />
                        PROMPT
                    </div>
                    <VariableSelector
                        currentNodeId={selectedNode.id}
                        nodes={nodes}
                        edges={edges}
                        onSelect={(varRef) => {
                            const current = selectedNode.data?.prompt || "";
                            updateSelectedNode({ prompt: current + varRef });
                        }}
                    />
                </div>

                <Textarea
                    variant="bordered"
                    minRows={8}
                    placeholder="在此输入指令..."
                    value={selectedNode.data?.prompt || ""}
                    onValueChange={(v) => updateSelectedNode({ prompt: v })}
                    classNames={{ input: "font-mono text-[11px] leading-tight", innerWrapper: "p-1" }}
                />
            </div>

            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    点击 <Variable size={10} className="inline text-primary" /> 选择上游变量，格式：{" "}
                    <kbd className="bg-primary/10 text-primary font-bold px-1 rounded">{"{{node.output}}"}</kbd>
                </div>
            </div>
        </section>
    );
}
