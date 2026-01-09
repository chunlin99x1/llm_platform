import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Textarea
} from "@heroui/react";
import {
    Code,
    Variable
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "../../workflow-variable-selector";

export function CodeNodeConfig({
    selectedNode,
    updateSelectedNode,
    nodes,
    edges
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    edges: Edge[];
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                    <Code size={10} />
                    代码
                </div>
                <div className="flex items-center gap-1">
                    <VariableSelector
                        currentNodeId={selectedNode.id}
                        nodes={nodes}
                        edges={edges}
                        onSelect={(varRef) => {
                            const current = selectedNode.data?.code || "";
                            updateSelectedNode({ code: current + varRef });
                        }}
                    />
                    <Dropdown>
                        <DropdownTrigger>
                            <Button size="sm" variant="flat" className="h-6 text-[10px]">
                                {selectedNode.data?.language || "Python"}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="语言选择"
                            onAction={(key) => updateSelectedNode({ language: key as string })}
                        >
                            <DropdownItem key="Python">Python</DropdownItem>
                            <DropdownItem key="JavaScript">JavaScript</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>
            <Textarea
                variant="bordered"
                minRows={12}
                placeholder="# 在此输入代码..."
                value={selectedNode.data?.code || ""}
                onValueChange={(v) => updateSelectedNode({ code: v })}
                classNames={{
                    input: "font-mono text-[11px] leading-relaxed text-white",
                    inputWrapper: "bg-[#1e1e1e] p-2 border-default-200 hover:border-primary focus-within:border-primary !outline-none"
                }}
            />
            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    使用 <kbd className="bg-emerald-100 text-emerald-700 px-1 rounded">return</kbd> 返回结果。
                    点击 <Variable size={10} className="inline text-primary" /> 插入上游变量。
                </div>
            </div>
        </section>
    );
}
