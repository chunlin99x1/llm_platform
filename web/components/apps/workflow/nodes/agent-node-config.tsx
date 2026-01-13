/**
 * Agent 节点配置面板
 * 
 * 配置工作流内嵌 Agent
 */

import { Input, Textarea, Switch, Chip, Button } from "@heroui/react";
import { Bot, Wrench } from "lucide-react";
import { useState } from "react";
import { useTools, useKnowledgeBases } from "@/hooks/use-api";
import { QuickModelSelector } from "@/components/model-selector";

export function AgentNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    const { data: toolsData } = useTools();
    const { data: knowledgeBases } = useKnowledgeBases();
    const [showTools, setShowTools] = useState(false);

    // 展平工具列表
    const allTools: string[] = [];
    toolsData?.categories?.forEach((cat: any) => {
        cat.tools?.forEach((tool: any) => {
            allTools.push(tool.name);
        });
    });

    const enabledTools = selectedNode.data?.enabled_tools || [];

    const toggleTool = (toolName: string) => {
        const newTools = enabledTools.includes(toolName)
            ? enabledTools.filter((t: string) => t !== toolName)
            : [...enabledTools, toolName];
        updateSelectedNode({ enabled_tools: newTools });
    };

    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Bot size={10} />
                Agent 配置
            </div>

            <Input
                label="查询变量"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="{{start.query}}"
                value={selectedNode.data?.query || ""}
                onValueChange={(v) => updateSelectedNode({ query: v })}
                classNames={{
                    input: "font-mono text-[11px]",
                    label: "text-[10px]",
                    inputWrapper: "h-9"
                }}
            />

            <Textarea
                label="Agent 指令"
                labelPlacement="outside"
                variant="bordered"
                minRows={3}
                placeholder="你是一个智能助手..."
                value={selectedNode.data?.instructions || ""}
                onValueChange={(v) => updateSelectedNode({ instructions: v })}
                classNames={{
                    input: "text-[11px]",
                    label: "text-[10px]"
                }}
            />

            <QuickModelSelector
                type="llm"
                value={selectedNode.data?.model}
                onChange={(model) => updateSelectedNode({ model })}
            />

            <Input
                label="最大迭代次数"
                labelPlacement="outside"
                type="number"
                variant="bordered"
                size="sm"
                min={1}
                max={20}
                value={String(selectedNode.data?.max_iterations || 5)}
                onValueChange={(v) => updateSelectedNode({ max_iterations: parseInt(v) || 5 })}
                classNames={{
                    input: "text-[11px]",
                    label: "text-[10px]",
                    inputWrapper: "h-9"
                }}
            />

            {/* 工具选择 */}
            <div className="space-y-2">
                <div
                    className="text-[10px] font-semibold text-foreground-600 flex items-center gap-1 cursor-pointer"
                    onClick={() => setShowTools(!showTools)}
                >
                    <Wrench size={10} />
                    启用工具 ({enabledTools.length})
                </div>
                {showTools && (
                    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg max-h-[150px] overflow-y-auto">
                        {allTools.map((tool) => (
                            <Chip
                                key={tool}
                                size="sm"
                                variant={enabledTools.includes(tool) ? "solid" : "flat"}
                                color={enabledTools.includes(tool) ? "primary" : "default"}
                                className="cursor-pointer text-[10px]"
                                onClick={() => toggleTool(tool)}
                            >
                                {tool}
                            </Chip>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
