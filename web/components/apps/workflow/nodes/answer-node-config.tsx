import {
    MessageSquare,
    Terminal
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { VariableInput } from "../../workflow-variable-selector";

export function AnswerNodeConfig({
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
    return (
        <section className="flex flex-col gap-4">
            {/* 回复内容配置 */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                        <Terminal size={10} />
                        回复内容
                    </div>
                </div>

                <div className="bg-content1 rounded-lg">
                    <VariableInput
                        value={selectedNode.data?.answer || ""}
                        onChange={(v) => updateSelectedNode({ answer: v })}
                        placeholder="在此输入回复内容，支持引用变量..."
                        currentNodeId={selectedNode.id}
                        nodes={nodes}
                        edges={edges}
                        isTextarea
                        minRows={8}
                    />
                </div>
            </div>

            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    <div className="flex items-center gap-1 mb-1">
                        <MessageSquare size={10} className="text-primary" />
                        <span className="font-semibold">使用说明</span>
                    </div>
                    Chatflow 将流式输出该节点的内容给用户。可以使用变量来拼接回复。
                </div>
            </div>
        </section>
    );
}
