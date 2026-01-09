import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Input
} from "@heroui/react";
import {
    Box
} from "lucide-react";

export function KnowledgeNodeConfig({
    selectedNode,
    updateSelectedNode,
    knowledgeBases
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
    knowledgeBases: any[];
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Box size={10} />
                知识库设置
            </div>
            <Dropdown>
                <DropdownTrigger>
                    <Button variant="bordered" size="sm" className="justify-between h-9 text-[11px] w-full">
                        {selectedNode.data?.knowledgeBaseName || "选择知识库..."}
                        <span className="text-foreground-400">▼</span>
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label="选择知识库"
                    onAction={(key) => {
                        const kb = knowledgeBases.find(k => k.id === Number(key));
                        updateSelectedNode({
                            knowledgeBaseId: Number(key),
                            knowledgeBaseName: kb?.name || String(key)
                        });
                    }}
                >
                    {knowledgeBases.map((kb) => (
                        <DropdownItem key={kb.id}>{kb.name}</DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
            <Input
                label="检索数量"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                type="number"
                placeholder="5"
                value={selectedNode.data?.topK || "5"}
                onValueChange={(v) => updateSelectedNode({ topK: v })}
                classNames={{ input: "text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
            />
            <Input
                label="相似度阈值"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="0.7"
                value={selectedNode.data?.threshold || "0.7"}
                onValueChange={(v) => updateSelectedNode({ threshold: v })}
                classNames={{ input: "text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
            />
        </section>
    );
}
