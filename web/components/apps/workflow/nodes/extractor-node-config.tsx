import {
    Button,
    Textarea
} from "@heroui/react";
import {
    FileCode
} from "lucide-react";

export function ExtractorNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <FileCode size={10} />
                参数提取
            </div>
            <Textarea
                label="输入文本"
                labelPlacement="outside"
                variant="bordered"
                minRows={3}
                placeholder="{{input}}"
                value={selectedNode.data?.input_text || "{{input}}"}
                onValueChange={(v) => updateSelectedNode({ input_text: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
            />
            <div className="text-[10px] font-bold text-foreground-500 px-1 mt-2">提取参数</div>
            <Button
                size="sm"
                variant="flat"
                color="primary"
                className="text-[10px] h-7"
                onPress={() => {
                    const params = [...(selectedNode.data?.parameters || [])];
                    params.push({ name: "", description: "", type: "string" });
                    updateSelectedNode({ parameters: params });
                }}
            >
                + 添加参数
            </Button>
        </section>
    );
}
