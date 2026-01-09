import {
    Button,
    Input,
    Textarea
} from "@heroui/react";
import {
    Box
} from "lucide-react";

export function ClassifierNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Box size={10} />
                分类设置
            </div>
            <Textarea
                label="分类说明"
                labelPlacement="outside"
                variant="bordered"
                minRows={3}
                placeholder="描述如何对问题进行分类..."
                value={selectedNode.data?.classifierDesc || ""}
                onValueChange={(v) => updateSelectedNode({ classifierDesc: v })}
                classNames={{ input: "text-[11px]", label: "text-[10px]" }}
            />
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1 mt-2">
                分类列表
            </div>
            <div className="space-y-2">
                {(selectedNode.data?.categories || ["技术问题", "产品咨询", "其他"]).map((cat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${["bg-green-500", "bg-blue-500", "bg-orange-500", "bg-purple-500"][idx % 4]}`} />
                        <Input
                            variant="bordered"
                            size="sm"
                            value={cat}
                            classNames={{ input: "text-[11px]", inputWrapper: "h-8 flex-1" }}
                        />
                    </div>
                ))}
            </div>
            <Button size="sm" variant="flat" color="primary" className="text-[10px] h-7">
                + 添加分类
            </Button>
        </section>
    );
}
