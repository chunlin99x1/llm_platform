import {
    Plus,
    Trash2,
    Variable
} from "lucide-react";
import { Button } from "@heroui/react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "../../workflow-variable-selector";

export function EndNodeConfig({
    selectedNode,
    updateSelectedNode,
    nodes,
    edges,
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    edges: Edge[];
}) {
    const outputs = selectedNode.data?.outputs || [];

    const handleAddOutput = () => {
        updateSelectedNode({
            outputs: [
                ...outputs,
                { name: "", variable: "", type: "string" }
            ]
        });
    };

    const handleUpdateOutput = (index: number, patch: any) => {
        const newOutputs = [...outputs];
        newOutputs[index] = { ...newOutputs[index], ...patch };
        updateSelectedNode({ outputs: newOutputs });
    };

    const handleRemoveOutput = (index: number) => {
        const newOutputs = [...outputs];
        newOutputs.splice(index, 1);
        updateSelectedNode({ outputs: newOutputs });
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-bold text-foreground-500 uppercase tracking-wide">
                    输出变量
                </div>
                <Button
                    size="sm"
                    variant="light"
                    className="h-6 px-2 text-[10px] text-primary"
                    onPress={handleAddOutput}
                >
                    <Plus size={12} className="mr-1" />
                    添加
                </Button>
            </div>

            <div className="flex flex-col gap-2">
                {outputs.length === 0 && (
                    <div className="py-8 text-center bg-content2/30 rounded-lg border border-dashed border-divider">
                        <div className="text-[10px] text-foreground-400">暂无输出变量</div>
                    </div>
                )}

                {outputs.map((output: any, index: number) => (
                    <div key={index} className="flex flex-col gap-2 p-3 bg-content1 border border-divider rounded-lg group">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={output.name}
                                onChange={(e) => handleUpdateOutput(index, { name: e.target.value })}
                                placeholder="输出变量名"
                                className="flex-1 text-[11px] h-7 px-2 border border-divider rounded bg-transparent focus:outline-none focus:border-primary"
                            />
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="h-6 w-6 text-foreground-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                onPress={() => handleRemoveOutput(index)}
                            >
                                <Trash2 size={12} />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-[10px] text-foreground-500 whitespace-nowrap">值</div>
                            <div className="flex-1 relative">
                                <div className="flex items-center gap-2 h-7 px-2 border border-divider rounded bg-content2/50 text-[11px] w-full cursor-pointer hover:border-primary/50 transition-colors">
                                    <Variable size={12} className="text-primary shrink-0" />
                                    <span className="truncate font-mono text-foreground-600">
                                        {output.variable || "选择变量..."}
                                    </span>
                                    {/* 覆盖整个区域的变量选择器 */}
                                    <div className="absolute inset-0 opacity-0">
                                        <VariableSelector
                                            currentNodeId={selectedNode.id}
                                            nodes={nodes}
                                            edges={edges}
                                            onSelect={(v) => handleUpdateOutput(index, { variable: v })}
                                            trigger={<div className="w-full h-full cursor-pointer" />}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    定义 Workflow 运行结束时返回的 JSON 数据结构。
                </div>
            </div>
        </section>
    );
}
