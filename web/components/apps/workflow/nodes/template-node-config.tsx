import {
    Textarea
} from "@heroui/react";
import {
    Code
} from "lucide-react";

export function TemplateNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Code size={10} />
                模板设置
            </div>
            <Textarea
                label="Jinja2 模板"
                labelPlacement="outside"
                variant="bordered"
                minRows={6}
                placeholder="{% for item in items %}&#10;{{ item.name }}&#10;{% endfor %}"
                value={selectedNode.data?.template || ""}
                onValueChange={(v) => updateSelectedNode({ template: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
            />
            <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <div className="text-[10px] text-foreground-600 leading-tight">
                    支持 Jinja2 语法，如循环、条件、过滤器等。
                </div>
            </div>
        </section>
    );
}
