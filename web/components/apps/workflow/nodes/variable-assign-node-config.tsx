import {
    Input,
    Textarea
} from "@heroui/react";
import {
    Variable
} from "lucide-react";

export function VariableAssignNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Variable size={10} />
                变量设置
            </div>
            <Input
                label="变量名"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="my_variable"
                value={selectedNode.data?.variableName || ""}
                onValueChange={(v) => updateSelectedNode({ variableName: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
            />
            <Textarea
                label="值"
                labelPlacement="outside"
                variant="bordered"
                minRows={3}
                placeholder="静态值或 {{node.output}}"
                value={selectedNode.data?.value || ""}
                onValueChange={(v) => updateSelectedNode({ value: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
            />
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    可引用其他节点输出：<kbd className="bg-amber-100 text-amber-700 px-1 rounded">{"{{nodeId.output}}"}</kbd>
                </div>
            </div>
        </section>
    );
}
