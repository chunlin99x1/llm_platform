/**
 * Tool 节点配置面板
 * 
 * 配置单个工具调用
 */

import { Select, SelectItem, Input, Textarea, Chip } from "@heroui/react";
import { Wrench } from "lucide-react";
import { useTools } from "@/hooks/use-api";
import type { Selection } from "@heroui/react";

export function ToolNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    const { data: toolsData, loading } = useTools();

    // 展平工具列表
    const allTools: { name: string; description: string; category: string }[] = [];
    toolsData?.categories?.forEach((cat: any) => {
        cat.tools?.forEach((tool: any) => {
            allTools.push({
                name: tool.name,
                description: tool.description,
                category: cat.category
            });
        });
    });

    const handleToolChange = (keys: Selection) => {
        const toolName = Array.from(keys)[0] as string;
        updateSelectedNode({ tool_name: toolName });
    };

    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Wrench size={10} />
                工具调用
            </div>

            <Select
                label="选择工具"
                labelPlacement="outside"
                placeholder={loading ? "加载中..." : "选择要调用的工具"}
                selectedKeys={selectedNode.data?.tool_name ? [selectedNode.data.tool_name] : []}
                onSelectionChange={handleToolChange}
                isLoading={loading}
                classNames={{
                    trigger: "h-10",
                    label: "text-[10px]",
                    value: "text-[11px]"
                }}
            >
                {allTools.map((tool) => (
                    <SelectItem
                        key={tool.name}
                        textValue={tool.name}
                        startContent={
                            <Chip size="sm" variant="flat" className="text-[8px]">
                                {tool.category}
                            </Chip>
                        }
                    >
                        <div className="flex flex-col">
                            <span className="text-[11px]">{tool.name}</span>
                            <span className="text-[9px] text-gray-400">{tool.description}</span>
                        </div>
                    </SelectItem>
                ))}
            </Select>

            <Textarea
                label="参数 (JSON)"
                labelPlacement="outside"
                variant="bordered"
                minRows={4}
                placeholder={'{\n  "query": "{{start.input}}"\n}'}
                value={selectedNode.data?.tool_parameters ? JSON.stringify(selectedNode.data.tool_parameters, null, 2) : ""}
                onValueChange={(v) => {
                    try {
                        updateSelectedNode({ tool_parameters: JSON.parse(v) });
                    } catch {
                        // 忽略 JSON 解析错误
                    }
                }}
                classNames={{
                    input: "font-mono text-[11px]",
                    label: "text-[10px]"
                }}
            />
        </section>
    );
}
