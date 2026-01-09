import {
    Input
} from "@heroui/react";
import {
    GitBranch
} from "lucide-react";

export function IterationNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <GitBranch size={10} />
                迭代设置
            </div>
            <Input
                label="输入列表"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="{{items}} 或 {{node.output}}"
                value={selectedNode.data?.inputList || ""}
                onValueChange={(v) => updateSelectedNode({ inputList: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
            />
            <Input
                label="迭代变量名"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="item"
                value={selectedNode.data?.iteratorVar || "item"}
                onValueChange={(v) => updateSelectedNode({ iteratorVar: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
            />
            <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    在迭代内部使用 <kbd className="bg-cyan-100 text-cyan-700 px-1 rounded">{"{{item}}"}</kbd> 访问当前元素。
                </div>
            </div>
        </section>
    );
}
